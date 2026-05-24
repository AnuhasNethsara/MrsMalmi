// ─────────────────────────────────────────────────────────────────────────────
// Anti-Raid Service — Detects and manages raid-related activity using Redis
// ─────────────────────────────────────────────────────────────────────────────

const { ANTI_RAID } = require('../../config/constants');
const Guild = require('../../database/models/Guild');
const logger = require('../../utils/logger');

// Default raid mode TTL: 5 minutes
const RAID_MODE_TTL = 5 * 60;

/**
 * Fetches guild-specific anti-raid settings, falling back to ANTI_RAID defaults.
 * @param {string} guildId
 * @returns {Promise<object>} Merged settings
 */
async function getGuildSettings(guildId) {
  try {
    const guildDoc = await Guild.findOne({ guildId }).lean();
    if (guildDoc && guildDoc.security && guildDoc.security.antiRaid) {
      const s = guildDoc.security.antiRaid;
      return {
        enabled: s.enabled ?? false,
        joinThreshold: s.joinThreshold ?? ANTI_RAID.joinThreshold,
        joinWindow: s.joinWindow ?? ANTI_RAID.joinWindow,
        mentionThreshold: s.mentionThreshold ?? ANTI_RAID.mentionThreshold,
        webhookThreshold: ANTI_RAID.webhookThreshold,
        deletionThreshold: ANTI_RAID.deletionThreshold,
        deletionWindow: ANTI_RAID.deletionWindow,
        action: s.action ?? 'lockdown',
        whitelistedUsers: s.whitelistedUsers ?? [],
        alertChannelId: s.alertChannelId ?? null,
      };
    }
  } catch (err) {
    logger.error(`[AntiRaid] Failed to fetch guild settings for ${guildId}: ${err.message}`);
  }

  // Return defaults if no guild doc or error
  return {
    enabled: false,
    joinThreshold: ANTI_RAID.joinThreshold,
    joinWindow: ANTI_RAID.joinWindow,
    mentionThreshold: ANTI_RAID.mentionThreshold,
    webhookThreshold: ANTI_RAID.webhookThreshold,
    deletionThreshold: ANTI_RAID.deletionThreshold,
    deletionWindow: ANTI_RAID.deletionWindow,
    action: 'lockdown',
    whitelistedUsers: [],
    alertChannelId: null,
  };
}

const antiRaid = {
  /**
   * Checks for join spam using a Redis sorted set to track join timestamps.
   * Key: antiraid:joins:{guildId}
   *
   * @param {import('discord.js').Client} client - Discord client with redis attached
   * @param {import('discord.js').Guild} guild - The guild object
   * @param {import('discord.js').GuildMember} member - The joining member
   * @returns {Promise<{ triggered: boolean, count: number }>}
   */
  async checkJoinSpam(client, guild, member) {
    const redis = client.redis;
    const settings = await getGuildSettings(guild.id);
    const key = `antiraid:joins:${guild.id}`;
    const now = Date.now();
    const windowStart = now - settings.joinWindow;

    try {
      // Add this join event with timestamp as score, memberId as value
      await redis.zadd(key, now, `${member.id}:${now}`);

      // Remove entries outside the time window
      await redis.zremrangebyscore(key, '-inf', windowStart);

      // Count current entries within the window
      const count = await redis.zcard(key);

      // Set a TTL on the key so it auto-cleans (window * 2 for safety)
      const ttlSeconds = Math.ceil((settings.joinWindow * 2) / 1000);
      await redis.expire(key, ttlSeconds);

      const triggered = count >= settings.joinThreshold;

      if (triggered) {
        logger.warn(
          `[AntiRaid] Join spam detected in guild ${guild.id}: ${count} joins within ${settings.joinWindow}ms`
        );
      }

      return { triggered, count };
    } catch (err) {
      logger.error(`[AntiRaid] checkJoinSpam error for guild ${guild.id}: ${err.message}`);
      return { triggered: false, count: 0 };
    }
  },

  /**
   * Checks for mention spam in a single message.
   * Counts both user mentions and role mentions.
   *
   * @param {import('discord.js').Message} message - The message to check
   * @returns {Promise<{ triggered: boolean, count: number }>}
   */
  async checkMentionSpam(message) {
    const settings = await getGuildSettings(message.guild.id);

    // Count user mentions + role mentions
    const userMentions = message.mentions.users.size;
    const roleMentions = message.mentions.roles.size;
    const count = userMentions + roleMentions;

    const triggered = count >= settings.mentionThreshold;

    if (triggered) {
      logger.warn(
        `[AntiRaid] Mention spam detected in guild ${message.guild.id} by user ${message.author.id}: ${count} mentions`
      );
    }

    return { triggered, count };
  },

  /**
   * Checks for webhook creation spam using a Redis sorted set.
   * Key: antiraid:webhooks:{guildId}
   *
   * @param {import('discord.js').Client} client - Discord client with redis attached
   * @param {import('discord.js').Guild} guild - The guild object
   * @param {import('discord.js').User} executor - The user who created the webhook
   * @returns {Promise<{ triggered: boolean }>}
   */
  async checkWebhookSpam(client, guild, executor) {
    const redis = client.redis;
    const settings = await getGuildSettings(guild.id);
    const key = `antiraid:webhooks:${guild.id}`;
    const now = Date.now();
    // Use the deletion window for webhook tracking as well
    const windowStart = now - settings.deletionWindow;

    try {
      // Add this webhook creation event
      await redis.zadd(key, now, `${executor.id}:${now}`);

      // Remove entries outside the window
      await redis.zremrangebyscore(key, '-inf', windowStart);

      // Count current entries
      const count = await redis.zcard(key);

      // Set TTL for auto-cleanup
      const ttlSeconds = Math.ceil((settings.deletionWindow * 2) / 1000);
      await redis.expire(key, ttlSeconds);

      const triggered = count >= settings.webhookThreshold;

      if (triggered) {
        logger.warn(
          `[AntiRaid] Webhook spam detected in guild ${guild.id} by executor ${executor.id}: ${count} webhooks created`
        );
      }

      return { triggered };
    } catch (err) {
      logger.error(`[AntiRaid] checkWebhookSpam error for guild ${guild.id}: ${err.message}`);
      return { triggered: false };
    }
  },

  /**
   * Checks for channel/role deletion spam using a Redis sorted set.
   * Key: antiraid:deletions:{guildId}:{executorId}
   *
   * @param {import('discord.js').Client} client - Discord client with redis attached
   * @param {import('discord.js').Guild} guild - The guild object
   * @param {import('discord.js').User} executor - The user performing deletions
   * @param {string} type - The type of deletion ('channel' or 'role')
   * @returns {Promise<{ triggered: boolean, count: number }>}
   */
  async checkDeletionSpam(client, guild, executor, type) {
    const redis = client.redis;
    const settings = await getGuildSettings(guild.id);
    const key = `antiraid:deletions:${guild.id}:${executor.id}`;
    const now = Date.now();
    const windowStart = now - settings.deletionWindow;

    try {
      // Add this deletion event with type info
      await redis.zadd(key, now, `${type}:${now}`);

      // Remove entries outside the window
      await redis.zremrangebyscore(key, '-inf', windowStart);

      // Count current entries
      const count = await redis.zcard(key);

      // Set TTL for auto-cleanup
      const ttlSeconds = Math.ceil((settings.deletionWindow * 2) / 1000);
      await redis.expire(key, ttlSeconds);

      const triggered = count >= settings.deletionThreshold;

      if (triggered) {
        logger.warn(
          `[AntiRaid] Deletion spam detected in guild ${guild.id} by executor ${executor.id}: ${count} ${type} deletions`
        );
      }

      return { triggered, count };
    } catch (err) {
      logger.error(`[AntiRaid] checkDeletionSpam error for guild ${guild.id}: ${err.message}`);
      return { triggered: false, count: 0 };
    }
  },

  /**
   * Checks if raid mode is currently active for a guild.
   * Key: antiraid:raidmode:{guildId}
   *
   * @param {import('discord.js').Client} client - Discord client with redis attached
   * @param {string} guildId - The guild ID to check
   * @returns {Promise<boolean>} True if raid mode is active
   */
  async isRaidMode(client, guildId) {
    const redis = client.redis;

    try {
      const exists = await redis.exists(`antiraid:raidmode:${guildId}`);
      return exists === 1;
    } catch (err) {
      logger.error(`[AntiRaid] isRaidMode error for guild ${guildId}: ${err.message}`);
      return false;
    }
  },

  /**
   * Activates raid mode for a guild by setting a Redis key with TTL.
   * Default TTL is 5 minutes.
   *
   * @param {import('discord.js').Client} client - Discord client with redis attached
   * @param {string} guildId - The guild ID to activate raid mode for
   * @param {number} [ttl=300] - TTL in seconds (default 5 minutes)
   * @returns {Promise<void>}
   */
  async activateRaidMode(client, guildId, ttl = RAID_MODE_TTL) {
    const redis = client.redis;

    try {
      await redis.set(`antiraid:raidmode:${guildId}`, '1', 'EX', ttl);
      logger.warn(`[AntiRaid] Raid mode ACTIVATED for guild ${guildId} (TTL: ${ttl}s)`);
    } catch (err) {
      logger.error(`[AntiRaid] activateRaidMode error for guild ${guildId}: ${err.message}`);
    }
  },

  /**
   * Deactivates raid mode for a guild by removing the Redis key.
   *
   * @param {import('discord.js').Client} client - Discord client with redis attached
   * @param {string} guildId - The guild ID to deactivate raid mode for
   * @returns {Promise<void>}
   */
  async deactivateRaidMode(client, guildId) {
    const redis = client.redis;

    try {
      await redis.del(`antiraid:raidmode:${guildId}`);
      logger.info(`[AntiRaid] Raid mode DEACTIVATED for guild ${guildId}`);
    } catch (err) {
      logger.error(`[AntiRaid] deactivateRaidMode error for guild ${guildId}: ${err.message}`);
    }
  },
};

module.exports = antiRaid;
