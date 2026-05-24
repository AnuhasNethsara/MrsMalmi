// ─────────────────────────────────────────────────────────────────────────────
// Logging Service — Centralized Discord channel event logger
// ─────────────────────────────────────────────────────────────────────────────

const { EmbedBuilder } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { COLORS, BRANDING } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Maps log event types to their corresponding guild settings path.
 */
const logTypes = {
  moderation: 'logging.channels.moderation',
  messages: 'logging.channels.messages',
  members: 'logging.channels.members',
  voice: 'logging.channels.voice',
  server: 'logging.channels.server',
};

/**
 * Color mapping for log event types.
 */
const logColors = {
  moderation: COLORS.moderation,
  messages: 0x3498db,
  members: 0x2ecc71,
  voice: 0x9b59b6,
  server: 0xe67e22,
};

/**
 * Sends a log event to the configured Discord channel for the guild.
 * If the channel is unavailable, queues the event in Redis for retry.
 *
 * @param {import('discord.js').Client} client - The Discord client
 * @param {string} guildId - The guild ID
 * @param {string} type - The log type ('moderation', 'messages', 'members', 'voice', 'server')
 * @param {Object} data - The event data
 * @param {string} [data.action] - The action that occurred
 * @param {string} [data.actor] - Who performed the action
 * @param {string} [data.target] - Who/what was affected
 * @param {string} [data.reason] - Reason for the action
 * @param {string} [data.description] - Additional description
 * @param {Array} [data.fields] - Additional embed fields [{ name, value, inline }]
 * @param {string} [data.thumbnail] - Thumbnail URL
 */
async function logEvent(client, guildId, type, data = {}) {
  try {
    // Validate log type
    if (!logTypes[type]) {
      logger.warn(`[Logging] Invalid log type: ${type}`);
      return;
    }

    // Fetch guild settings
    const guildDoc = await Guild.findOne({ guildId }).lean();

    // Check if logging is enabled
    if (!guildDoc?.logging?.enabled) return;

    // Get the channel ID for this log type
    const channelId = guildDoc.logging.channels?.[type];
    if (!channelId) return;

    // Build the log embed
    const embed = buildLogEmbed(type, data);

    // Try to send to the channel
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(channelId);

    if (channel) {
      try {
        await channel.send({ embeds: [embed] });
        return;
      } catch (sendErr) {
        logger.warn(`[Logging] Failed to send to channel ${channelId}: ${sendErr.message}`);
      }
    }

    // Channel unavailable — queue in Redis for retry
    await queueLogEvent(client, guildId, type, data);
  } catch (err) {
    logger.error(`[Logging] Error in logEvent: ${err.message}`);
  }
}

/**
 * Builds a Discord embed for a log event.
 * @param {string} type - The log type
 * @param {Object} data - The event data
 * @returns {EmbedBuilder}
 */
function buildLogEmbed(type, data) {
  const embed = new EmbedBuilder()
    .setColor(logColors[type] || COLORS.primary)
    .setTimestamp()
    .setFooter({ text: BRANDING.footer });

  // Set title from action or type
  const title = data.action || `${type.charAt(0).toUpperCase() + type.slice(1)} Event`;
  embed.setTitle(title);

  // Set description if provided
  if (data.description) {
    embed.setDescription(data.description);
  }

  // Build fields
  const fields = [];

  if (data.actor) {
    fields.push({ name: 'Actor', value: data.actor, inline: true });
  }

  if (data.target) {
    fields.push({ name: 'Target', value: data.target, inline: true });
  }

  if (data.reason) {
    fields.push({ name: 'Reason', value: data.reason, inline: false });
  }

  // Add any additional fields
  if (data.fields && Array.isArray(data.fields)) {
    fields.push(...data.fields);
  }

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  // Set thumbnail if provided
  if (data.thumbnail) {
    embed.setThumbnail(data.thumbnail);
  }

  return embed;
}

/**
 * Queues a log event in Redis for later retry.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} type
 * @param {Object} data
 */
async function queueLogEvent(client, guildId, type, data) {
  try {
    const redis = client.redis;
    if (!redis) {
      logger.warn('[Logging] Redis not available, cannot queue log event.');
      return;
    }

    const key = `logs:queue:${guildId}`;
    const event = JSON.stringify({ type, data, timestamp: Date.now() });

    // Push to the list
    await redis.rpush(key, event);

    // Trim to max 100 events per guild
    await redis.ltrim(key, -100, -1);

    logger.debug(`[Logging] Queued event for guild ${guildId} (type: ${type})`);
  } catch (err) {
    logger.error(`[Logging] Failed to queue event: ${err.message}`);
  }
}

module.exports = {
  logEvent,
  logTypes,
  buildLogEmbed,
};
