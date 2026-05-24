// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Filter — Detects repeated messages using Redis
// ─────────────────────────────────────────────────────────────────────────────

const { AUTO_MOD } = require('../../../config/constants');
const logger = require('../../../utils/logger');
const crypto = require('crypto');

/**
 * Creates a simple hash of message content for comparison.
 * @param {string} content - The message content to hash
 * @returns {string} A hex hash string
 */
function hashContent(content) {
  return crypto.createHash('md5').update(content.toLowerCase().trim()).digest('hex');
}

/**
 * Checks if a user is sending duplicate messages.
 * Uses a Redis list to track recent message hashes per user per guild.
 * Key: automod:dupes:{guildId}:{userId}
 *
 * @param {import('discord.js').Message} message - The message to check
 * @param {import('discord.js').Client} client - Discord client with redis attached
 * @returns {Promise<{ triggered: boolean, reason: string, severity: number }>}
 */
async function check(message, client) {
  const redis = client.redis;
  const key = `automod:dupes:${message.guild.id}:${message.author.id}`;
  const hash = hashContent(message.content);
  const now = Date.now();
  const entry = `${hash}:${now}`;

  try {
    // Push the new message hash with timestamp
    await redis.lpush(key, entry);

    // Trim the list to keep only recent entries (max 20 for safety)
    await redis.ltrim(key, 0, 19);

    // Set TTL for auto-cleanup
    const ttlSeconds = Math.ceil(AUTO_MOD.duplicateWindow / 1000);
    await redis.expire(key, ttlSeconds);

    // Get all entries and count duplicates within the window
    const entries = await redis.lrange(key, 0, -1);
    const windowStart = now - AUTO_MOD.duplicateWindow;

    let duplicateCount = 0;
    for (const item of entries) {
      const [itemHash, itemTime] = item.split(':');
      if (itemHash === hash && parseInt(itemTime, 10) >= windowStart) {
        duplicateCount++;
      }
    }

    const triggered = duplicateCount >= AUTO_MOD.duplicateThreshold;

    if (triggered) {
      logger.info(
        `[AutoMod:DuplicateFilter] Duplicate messages detected from ${message.author.tag} in guild ${message.guild.id}: ${duplicateCount} duplicates`
      );
    }

    return {
      triggered,
      reason: triggered ? `Sending duplicate messages (${duplicateCount} times in ${AUTO_MOD.duplicateWindow / 1000}s)` : '',
      severity: triggered ? 2 : 0,
    };
  } catch (err) {
    logger.error(`[AutoMod:DuplicateFilter] Error checking duplicates for ${message.author.id}: ${err.message}`);
    return { triggered: false, reason: '', severity: 0 };
  }
}

module.exports = { check };
