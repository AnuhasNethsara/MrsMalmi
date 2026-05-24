// ─────────────────────────────────────────────────────────────────────────────
// Punishment Manager — Handles moderation actions (ban, kick, mute, warn, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const ms = require('ms');
const Punishment = require('../../database/models/Punishment');
const User = require('../../database/models/User');
const logger = require('../../utils/logger');

/**
 * Creates a moderation case with auto-increment caseId.
 * @param {string} guildId - The guild ID
 * @param {string} userId - The target user ID
 * @param {string} moderatorId - The moderator's user ID
 * @param {string} action - The action type (warn, mute, kick, ban, unmute, unban)
 * @param {string} reason - Reason for the action
 * @param {number|null} duration - Duration in milliseconds (null for permanent)
 * @returns {Promise<Object>} The created punishment document
 */
async function createCase(guildId, userId, moderatorId, action, reason, duration = null) {
  const caseId = await Punishment.getNextCaseId(guildId);

  const punishmentData = {
    caseId,
    guildId,
    userId,
    moderatorId,
    action,
    reason: reason || 'No reason provided',
    duration,
    active: true,
  };

  if (duration) {
    punishmentData.expiresAt = new Date(Date.now() + duration);
  }

  const punishment = await Punishment.create(punishmentData);
  logger.info(`[Moderation] Case #${caseId} created in guild ${guildId}: ${action} on ${userId} by ${moderatorId}`);
  return punishment;
}

/**
 * Schedules a punishment expiry via Redis key with TTL.
 * @param {import('discord.js').Client} client - The Discord client (with client.redis)
 * @param {string} guildId - The guild ID
 * @param {number} caseId - The case ID
 * @param {number} duration - Duration in milliseconds
 */
async function scheduleExpiry(client, guildId, caseId, duration) {
  const key = `punishment:expire:${guildId}:${caseId}`;
  const seconds = Math.ceil(duration / 1000);
  await client.redis.set(key, 'expire', 'EX', seconds);
  logger.info(`[Moderation] Scheduled expiry for case #${caseId} in guild ${guildId} (${seconds}s)`);
}

/**
 * Attempts to DM the target user about a moderation action.
 * Silently catches errors if DMs are disabled.
 * @param {import('discord.js').User} target - The target user
 * @param {string} guildName - The guild name
 * @param {string} action - The action taken
 * @param {string} reason - The reason
 * @param {string|null} duration - Human-readable duration string
 */
async function dmTarget(target, guildName, action, reason, duration) {
  try {
    let message = `You have been **${action}** in **${guildName}**.\n**Reason:** ${reason}`;
    if (duration) {
      message += `\n**Duration:** ${duration}`;
    }
    await target.send(message);
  } catch {
    // DMs disabled or blocked — silently ignore
  }
}

/**
 * Bans a user from the guild.
 * @param {import('discord.js').Client} client - The Discord client
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').User} moderator - The moderator
 * @param {import('discord.js').User} target - The target user
 * @param {string} reason - Reason for the ban
 * @param {string|null} duration - Duration string (e.g. '7d', '24h') or null for permanent
 * @returns {Promise<Object>} The created case
 */
async function ban(client, guild, moderator, target, reason, duration = null) {
  const durationMs = duration ? ms(duration) : null;

  // DM the target before banning
  await dmTarget(target, guild.name, 'banned', reason, duration);

  // Execute the ban
  await guild.members.ban(target.id, { reason: `[${moderator.tag}] ${reason}` });

  // Create the case
  const punishment = await createCase(guild.id, target.id, moderator.id, 'ban', reason, durationMs);

  // Schedule expiry if duration is set
  if (durationMs) {
    await scheduleExpiry(client, guild.id, punishment.caseId, durationMs);
  }

  return punishment;
}

/**
 * Kicks a user from the guild.
 * @param {import('discord.js').Client} client - The Discord client
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').User} moderator - The moderator
 * @param {import('discord.js').GuildMember} target - The target member
 * @param {string} reason - Reason for the kick
 * @returns {Promise<Object>} The created case
 */
async function kick(client, guild, moderator, target, reason) {
  // DM the target before kicking
  await dmTarget(target.user || target, guild.name, 'kicked', reason, null);

  // Execute the kick
  const member = guild.members.cache.get(target.id) || await guild.members.fetch(target.id).catch(() => null);
  if (member) {
    await member.kick(`[${moderator.tag}] ${reason}`);
  }

  // Create the case
  const punishment = await createCase(guild.id, target.id, moderator.id, 'kick', reason);
  return punishment;
}

/**
 * Mutes (timeouts) a user in the guild.
 * @param {import('discord.js').Client} client - The Discord client
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').User} moderator - The moderator
 * @param {import('discord.js').GuildMember} target - The target member
 * @param {string} reason - Reason for the mute
 * @param {string} duration - Duration string (e.g. '1h', '30m')
 * @returns {Promise<Object>} The created case
 */
async function mute(client, guild, moderator, target, reason, duration) {
  const durationMs = ms(duration);

  // DM the target before muting
  await dmTarget(target.user || target, guild.name, 'muted', reason, duration);

  // Execute the timeout
  const member = guild.members.cache.get(target.id) || await guild.members.fetch(target.id).catch(() => null);
  if (member) {
    await member.timeout(durationMs, `[${moderator.tag}] ${reason}`);
  }

  // Create the case
  const punishment = await createCase(guild.id, target.id, moderator.id, 'mute', reason, durationMs);

  // Schedule expiry
  await scheduleExpiry(client, guild.id, punishment.caseId, durationMs);

  return punishment;
}

/**
 * Unmutes a user in the guild (removes timeout).
 * @param {import('discord.js').Client} client - The Discord client
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').User} moderator - The moderator
 * @param {import('discord.js').GuildMember} target - The target member
 * @param {string} reason - Reason for the unmute
 * @returns {Promise<Object>} The created case
 */
async function unmute(client, guild, moderator, target, reason) {
  // DM the target
  await dmTarget(target.user || target, guild.name, 'unmuted', reason, null);

  // Remove the timeout
  const member = guild.members.cache.get(target.id) || await guild.members.fetch(target.id).catch(() => null);
  if (member) {
    await member.timeout(null, `[${moderator.tag}] ${reason}`);
  }

  // Create the case
  const punishment = await createCase(guild.id, target.id, moderator.id, 'unmute', reason);
  return punishment;
}

/**
 * Warns a user and increments their warning count.
 * @param {import('discord.js').Client} client - The Discord client
 * @param {import('discord.js').Guild} guild - The guild
 * @param {import('discord.js').User} moderator - The moderator
 * @param {import('discord.js').User} target - The target user
 * @param {string} reason - Reason for the warning
 * @returns {Promise<Object>} The created case
 */
async function warn(client, guild, moderator, target, reason) {
  // DM the target
  await dmTarget(target, guild.name, 'warned', reason, null);

  // Increment warnings on the user document
  await User.findOneAndUpdate(
    { userId: target.id, guildId: guild.id },
    { $inc: { warnings: 1 } },
    { upsert: true }
  );

  // Create the case
  const punishment = await createCase(guild.id, target.id, moderator.id, 'warn', reason);
  return punishment;
}

module.exports = {
  ban,
  kick,
  mute,
  unmute,
  warn,
  createCase,
  scheduleExpiry,
};
