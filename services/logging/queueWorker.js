// ─────────────────────────────────────────────────────────────────────────────
// Queue Worker — Retries failed log events stored in Redis
// ─────────────────────────────────────────────────────────────────────────────

const Guild = require('../../database/models/Guild');
const { buildLogEmbed } = require('./logger');
const logger = require('../../utils/logger');

const RETRY_INTERVAL = 30000; // 30 seconds
const MAX_QUEUE_SIZE = 100; // Max events per guild

let workerInterval = null;

/**
 * Starts the queue worker that periodically retries failed log events.
 * @param {import('discord.js').Client} client
 */
function startQueueWorker(client) {
  if (workerInterval) {
    logger.warn('[QueueWorker] Worker already running.');
    return;
  }

  logger.info('[QueueWorker] Starting log queue worker (interval: 30s).');

  workerInterval = setInterval(async () => {
    await processQueues(client);
  }, RETRY_INTERVAL);

  // Run once immediately on start
  processQueues(client);
}

/**
 * Stops the queue worker.
 */
function stopQueueWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('[QueueWorker] Stopped log queue worker.');
  }
}

/**
 * Processes all queued log events across all guilds.
 * @param {import('discord.js').Client} client
 */
async function processQueues(client) {
  try {
    const redis = client.redis;
    if (!redis) return;

    // Find all queue keys
    const keys = await redis.keys('logs:queue:*');
    if (!keys || keys.length === 0) return;

    for (const key of keys) {
      const guildId = key.replace('logs:queue:', '');
      await processGuildQueue(client, redis, guildId, key);
    }
  } catch (err) {
    logger.error(`[QueueWorker] Error processing queues: ${err.message}`);
  }
}

/**
 * Processes the queue for a single guild.
 * @param {import('discord.js').Client} client
 * @param {import('ioredis').Redis} redis
 * @param {string} guildId
 * @param {string} key
 */
async function processGuildQueue(client, redis, guildId, key) {
  try {
    // Get the queue length
    const queueLength = await redis.llen(key);
    if (queueLength === 0) return;

    // Trim to max queue size
    if (queueLength > MAX_QUEUE_SIZE) {
      await redis.ltrim(key, queueLength - MAX_QUEUE_SIZE, -1);
    }

    // Fetch guild settings
    const guildDoc = await Guild.findOne({ guildId }).lean();
    if (!guildDoc?.logging?.enabled) {
      // Logging disabled — clear the queue
      await redis.del(key);
      return;
    }

    // Get the guild from cache
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    // Process events from the front of the queue
    const eventsToProcess = await redis.lrange(key, 0, -1);
    const successfulIndices = [];

    for (let i = 0; i < eventsToProcess.length; i++) {
      try {
        const event = JSON.parse(eventsToProcess[i]);
        const { type, data } = event;

        // Get the channel for this log type
        const channelId = guildDoc.logging.channels?.[type];
        if (!channelId) {
          // No channel configured — remove from queue
          successfulIndices.push(i);
          continue;
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
          // Channel still unavailable — skip for now
          continue;
        }

        // Build and send the embed
        const embed = buildLogEmbed(type, data);
        await channel.send({ embeds: [embed] });

        successfulIndices.push(i);
      } catch (sendErr) {
        // Failed to send — leave in queue for next retry
        logger.debug(`[QueueWorker] Failed to send queued event for guild ${guildId}: ${sendErr.message}`);
      }
    }

    // Remove successfully sent events
    // We process from back to front to maintain correct indices
    if (successfulIndices.length === eventsToProcess.length) {
      // All events processed — clear the queue
      await redis.del(key);
    } else if (successfulIndices.length > 0) {
      // Mark processed events and rebuild the queue
      const remaining = eventsToProcess.filter((_, i) => !successfulIndices.includes(i));
      await redis.del(key);
      if (remaining.length > 0) {
        await redis.rpush(key, ...remaining);
      }
    }
  } catch (err) {
    logger.error(`[QueueWorker] Error processing guild ${guildId}: ${err.message}`);
  }
}

module.exports = {
  startQueueWorker,
  stopQueueWorker,
};
