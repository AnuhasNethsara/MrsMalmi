// ─────────────────────────────────────────────────────────────────────────────
// Service: Backup Manager — Creates and loads full server backups
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

/**
 * Ensures the backups directory exists.
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Creates a full server backup.
 * @param {import('discord.js').Guild} guild
 * @param {string} createdBy - User ID who created the backup
 * @returns {Promise<{ id: string, size: number }>}
 */
async function createBackup(guild, createdBy) {
  ensureBackupDir();

  const backup = {
    id: `${guild.id}-${Date.now()}`,
    guildId: guild.id,
    guildName: guild.name,
    createdBy,
    createdAt: new Date().toISOString(),
    roles: [],
    channels: [],
    settings: {},
  };

  // ── Backup roles ────────────────────────────────────────────────────────
  const roles = guild.roles.cache
    .filter((r) => !r.managed && r.id !== guild.id)
    .sort((a, b) => b.position - a.position);

  for (const [, role] of roles) {
    backup.roles.push({
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      permissions: role.permissions.bitfield.toString(),
      mentionable: role.mentionable,
      position: role.position,
    });
  }

  // ── Backup channels ─────────────────────────────────────────────────────
  const channels = guild.channels.cache.sort((a, b) => a.position - b.position);

  for (const [, channel] of channels) {
    const channelData = {
      name: channel.name,
      type: channel.type,
      position: channel.position,
      parentName: channel.parent?.name || null,
      topic: channel.topic || null,
      nsfw: channel.nsfw || false,
      rateLimitPerUser: channel.rateLimitPerUser || 0,
      bitrate: channel.bitrate || null,
      userLimit: channel.userLimit || null,
      permissionOverwrites: [],
    };

    channel.permissionOverwrites.cache.forEach((overwrite) => {
      channelData.permissionOverwrites.push({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow.bitfield.toString(),
        deny: overwrite.deny.bitfield.toString(),
      });
    });

    backup.channels.push(channelData);
  }

  // ── Backup settings ─────────────────────────────────────────────────────
  backup.settings = {
    name: guild.name,
    icon: guild.iconURL({ size: 1024 }),
    verificationLevel: guild.verificationLevel,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    explicitContentFilter: guild.explicitContentFilter,
  };

  // ── Save to file ────────────────────────────────────────────────────────
  const filePath = path.join(BACKUP_DIR, `${backup.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');

  const stats = fs.statSync(filePath);
  logger.info(`[Backup] Created backup ${backup.id} for guild ${guild.id} (${(stats.size / 1024).toFixed(1)}KB)`);

  return { id: backup.id, size: stats.size };
}

/**
 * Loads a backup onto a guild.
 * @param {import('discord.js').Guild} guild
 * @param {string} backupId
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function loadBackup(guild, backupId) {
  const filePath = path.join(BACKUP_DIR, `${backupId}.json`);
  if (!fs.existsSync(filePath)) {
    return { success: false, message: 'Backup not found.' };
  }

  const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  try {
    // ── Restore roles ───────────────────────────────────────────────────
    for (const roleData of backup.roles) {
      await guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        hoist: roleData.hoist,
        permissions: BigInt(roleData.permissions),
        mentionable: roleData.mentionable,
      }).catch(() => null);
    }

    // ── Restore channels ────────────────────────────────────────────────
    // Create categories first
    const categories = backup.channels.filter((c) => c.type === ChannelType.GuildCategory);
    const categoryMap = new Map();

    for (const catData of categories) {
      const cat = await guild.channels.create({
        name: catData.name,
        type: ChannelType.GuildCategory,
        position: catData.position,
      }).catch(() => null);
      if (cat) categoryMap.set(catData.name, cat.id);
    }

    // Create other channels
    const otherChannels = backup.channels.filter((c) => c.type !== ChannelType.GuildCategory);
    for (const chData of otherChannels) {
      const options = {
        name: chData.name,
        type: chData.type,
        position: chData.position,
        topic: chData.topic,
        nsfw: chData.nsfw,
        rateLimitPerUser: chData.rateLimitPerUser,
        parent: chData.parentName ? categoryMap.get(chData.parentName) : null,
      };

      if (chData.bitrate) options.bitrate = chData.bitrate;
      if (chData.userLimit) options.userLimit = chData.userLimit;

      await guild.channels.create(options).catch(() => null);
    }

    // ── Restore settings ────────────────────────────────────────────────
    await guild.setName(backup.settings.name).catch(() => null);
    await guild.setVerificationLevel(backup.settings.verificationLevel).catch(() => null);
    await guild.setDefaultMessageNotifications(backup.settings.defaultMessageNotifications).catch(() => null);
    await guild.setExplicitContentFilter(backup.settings.explicitContentFilter).catch(() => null);

    logger.info(`[Backup] Loaded backup ${backupId} onto guild ${guild.id}`);
    return { success: true };
  } catch (err) {
    logger.error(`[Backup] Error loading backup ${backupId}: ${err.message}`);
    return { success: false, message: `Error loading backup: ${err.message}` };
  }
}

/**
 * Lists available backups for a guild.
 * @param {string} guildId
 * @returns {Array<{ id: string, createdAt: string, size: number }>}
 */
function listBackups(guildId) {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(guildId) && f.endsWith('.json'));
  const backups = [];

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    backups.push({
      id: data.id,
      createdAt: data.createdAt,
      size: stats.size,
    });
  }

  return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  createBackup,
  loadBackup,
  listBackups,
};
