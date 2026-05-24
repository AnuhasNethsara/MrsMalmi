// ─────────────────────────────────────────────────────────────────────────────
// Raid Actions Service — Lockdown, kick, ban, alert, and permission stripping
// ─────────────────────────────────────────────────────────────────────────────

const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const antiRaid = require('./antiRaid');
const logger = require('../../utils/logger');

// Dangerous permissions that should be stripped during a raid
const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ManageWebhooks,
];

/**
 * Handles a detected raid by activating raid mode and taking the configured action.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @param {object} settings - Guild anti-raid settings
 */
async function handleRaid(client, guild, settings) {
  try {
    // Check if raid mode is already active to avoid duplicate actions
    const alreadyActive = await antiRaid.isRaidMode(client, guild.id);
    if (alreadyActive) return;

    // Activate raid mode
    await antiRaid.activateRaidMode(client, guild.id);

    // Take configured action
    switch (settings.action) {
      case 'lockdown':
        await lockdownGuild(guild);
        break;
      case 'kick':
        // Kick recent joins (members who joined in the last 30 seconds)
        await kickRecentJoins(guild);
        break;
      case 'ban':
        // Ban recent joins
        await banRecentJoins(guild);
        break;
      case 'alert':
        // Alert only, no automated action
        break;
      default:
        await lockdownGuild(guild);
    }

    // Always alert admins
    await alertAdmins(client, guild, settings, `Raid detected — action taken: **${settings.action}**`);

    logger.warn(`[RaidActions] Raid handled in guild ${guild.id} with action: ${settings.action}`);
  } catch (err) {
    logger.error(`[RaidActions] handleRaid error for guild ${guild.id}: ${err.message}`);
  }
}

/**
 * Locks down the guild by denying SendMessages for @everyone on all text channels.
 * @param {import('discord.js').Guild} guild
 */
async function lockdownGuild(guild) {
  try {
    const channels = guild.channels.cache.filter(
      (ch) => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement
    );

    const everyoneRole = guild.roles.everyone;

    for (const [, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false,
        }, { reason: '[AntiRaid] Lockdown activated — raid detected' });
      } catch (err) {
        logger.error(`[RaidActions] Failed to lock channel ${channel.id}: ${err.message}`);
      }
    }

    logger.info(`[RaidActions] Guild ${guild.id} locked down (${channels.size} channels)`);
  } catch (err) {
    logger.error(`[RaidActions] lockdownGuild error for guild ${guild.id}: ${err.message}`);
  }
}

/**
 * Unlocks the guild by restoring SendMessages for @everyone on all text channels.
 * @param {import('discord.js').Guild} guild
 */
async function unlockGuild(guild) {
  try {
    const channels = guild.channels.cache.filter(
      (ch) => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement
    );

    const everyoneRole = guild.roles.everyone;

    for (const [, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: null,
        }, { reason: '[AntiRaid] Lockdown lifted' });
      } catch (err) {
        logger.error(`[RaidActions] Failed to unlock channel ${channel.id}: ${err.message}`);
      }
    }

    logger.info(`[RaidActions] Guild ${guild.id} unlocked (${channels.size} channels)`);
  } catch (err) {
    logger.error(`[RaidActions] unlockGuild error for guild ${guild.id}: ${err.message}`);
  }
}

/**
 * Sends an alert embed to the configured alert channel.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @param {object} settings - Guild anti-raid settings
 * @param {string} reason - The reason/description for the alert
 */
async function alertAdmins(client, guild, settings, reason) {
  try {
    const channelId = settings.alertChannelId;
    if (!channelId) {
      logger.warn(`[RaidActions] No alert channel configured for guild ${guild.id}`);
      return;
    }

    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      logger.warn(`[RaidActions] Alert channel ${channelId} not found in guild ${guild.id}`);
      return;
    }

    const alertEmbed = createEmbed({
      title: '🚨 Anti-Raid Alert',
      description: reason,
      color: COLORS.error,
      fields: [
        { name: 'Guild', value: guild.name, inline: true },
        { name: 'Action Taken', value: settings.action || 'lockdown', inline: true },
        { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      ],
    });

    await channel.send({ embeds: [alertEmbed] });
  } catch (err) {
    logger.error(`[RaidActions] alertAdmins error for guild ${guild.id}: ${err.message}`);
  }
}

/**
 * Strips dangerous permissions from all roles a user has.
 * @param {import('discord.js').Guild} guild
 * @param {string} userId - The user ID to strip permissions from
 */
async function stripPermissions(guild, userId) {
  try {
    const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      logger.warn(`[RaidActions] Could not find member ${userId} in guild ${guild.id}`);
      return;
    }

    // Get all roles the member has (excluding @everyone)
    const roles = member.roles.cache.filter((role) => role.id !== guild.id);

    for (const [, role] of roles) {
      // Skip managed roles (bot roles, integration roles)
      if (role.managed) continue;

      // Check if the role has any dangerous permissions
      const hasDangerous = DANGEROUS_PERMISSIONS.some((perm) => role.permissions.has(perm));
      if (!hasDangerous) continue;

      try {
        // Remove dangerous permissions from the role
        const newPermissions = role.permissions.remove(DANGEROUS_PERMISSIONS);
        await role.setPermissions(newPermissions, '[AntiRaid] Dangerous permissions stripped due to suspicious activity');
        logger.info(`[RaidActions] Stripped permissions from role ${role.name} (${role.id}) in guild ${guild.id}`);
      } catch (err) {
        logger.error(`[RaidActions] Failed to strip permissions from role ${role.id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[RaidActions] stripPermissions error for user ${userId} in guild ${guild.id}: ${err.message}`);
  }
}

/**
 * Kicks members who joined within the last 30 seconds.
 * @param {import('discord.js').Guild} guild
 */
async function kickRecentJoins(guild) {
  const threshold = Date.now() - 30000;
  const recentMembers = guild.members.cache.filter(
    (m) => m.joinedTimestamp && m.joinedTimestamp > threshold && !m.user.bot
  );

  for (const [, member] of recentMembers) {
    try {
      if (member.kickable) {
        await member.kick('[AntiRaid] Kicked during raid detection');
      }
    } catch (err) {
      logger.error(`[RaidActions] Failed to kick member ${member.id}: ${err.message}`);
    }
  }

  logger.info(`[RaidActions] Kicked ${recentMembers.size} recent joins in guild ${guild.id}`);
}

/**
 * Bans members who joined within the last 30 seconds.
 * @param {import('discord.js').Guild} guild
 */
async function banRecentJoins(guild) {
  const threshold = Date.now() - 30000;
  const recentMembers = guild.members.cache.filter(
    (m) => m.joinedTimestamp && m.joinedTimestamp > threshold && !m.user.bot
  );

  for (const [, member] of recentMembers) {
    try {
      if (member.bannable) {
        await member.ban({ reason: '[AntiRaid] Banned during raid detection', deleteMessageSeconds: 60 });
      }
    } catch (err) {
      logger.error(`[RaidActions] Failed to ban member ${member.id}: ${err.message}`);
    }
  }

  logger.info(`[RaidActions] Banned ${recentMembers.size} recent joins in guild ${guild.id}`);
}

module.exports = {
  handleRaid,
  lockdownGuild,
  unlockGuild,
  alertAdmins,
  stripPermissions,
};
