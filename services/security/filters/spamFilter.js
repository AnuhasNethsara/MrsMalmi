// ─────────────────────────────────────────────────────────────────────────────
// Spam Filter — Detects message rate spam using Redis sorted sets
// ─────────────────────────────────────────────────────────────────────────────

const { AUTO_MOD } = require('../../../config/constants');
const logger = require('../../../utils/logger');

/**
 * Checks if a user is sending messages too quickly (spam).
 * Uses a Redis sorted set to track message timestamps per user per guild.
 * Key: automod:spam:{guildId}:{userId}
 *
 * @param {import('discord.js').Message} message - The message to check
 * @param {import('discord.js').Client} client - Discord client with redis attached
 * @returns {Promise<{ triggered: boolean, reason: string, severity: number }>}
 */
async function check(message, client) {
  const redis = client.redis;
  const key = `automod:spam:${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const windowStart = now - AUTO_MOD.spamWindow;

  try {
    // Add this message timestamp to the sorted set
    await redis.zadd(key, now, `${message.id}:${now}`);

    // Remove entries outside the time window
    await redis.zremrangebyscore(key, '-inf', windowStart);

    // Count messages within the window
    const count = await redis.zcard(key);

    // Set TTL for auto-cleanup (window * 2 for safety)
    const ttlSeconds = Math.ceil((AUTO_MOD.spamWindow * 2) / 1000);
    await redis.expire(key, ttlSeconds);

    const triggered = count > AUTO_MOD.spamThreshold;

    if (triggered) {
      logger.info(
        `[AutoMod:SpamFilter] Spam detected from ${message.author.tag} in guild ${message.guild.id}: ${count} messages in ${AUTO_MOD.spamWindow}ms`
      );
    }

    return {
      triggered,
      reason: triggered ? `Sending messages too quickly (${count} messages in ${AUTO_MOD.spamWindow / 1000}s)` : '',
      severity: triggered ? 2 : 0,
    };
  } catch (err) {
    logger.error(`[AutoMod:SpamFilter] Error checking spam for ${message.author.id}: ${err.message}`);
    return { triggered: false, reason: '', severity: 0 };
  }
}

module.exports = { check };
