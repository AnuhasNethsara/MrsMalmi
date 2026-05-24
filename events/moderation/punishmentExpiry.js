// ─────────────────────────────────────────────────────────────────────────────
// Event: Punishment Expiry — Listens for Redis keyspace notifications
// Reverts expired punishments (unbans/unmutes) automatically
// ─────────────────────────────────────────────────────────────────────────────

const Redis = require('ioredis');
const config = require('../../config/config');
const Punishment = require('../../database/models/Punishment');
const caseManager = require('../../services/moderation/caseManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'ready',
  once: true,

  /**
   * Sets up a Redis subscriber for keyspace notifications on expired keys.
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    try {
      // Enable keyspace notifications on the main Redis connection
      await client.redis.config('SET', 'notify-keyspace-events', 'Ex');
      logger.info('[PunishmentExpiry] Enabled Redis keyspace notifications (Ex).');
    } catch (err) {
      // Some managed Redis instances don't allow CONFIG SET — log and continue
      logger.warn(`[PunishmentExpiry] Could not set keyspace notifications: ${err.message}. Ensure they are enabled in Redis config.`);
    }

    // Create a separate subscriber connection for keyspace events
    const subscriber = new Redis(config.redis.url);

    subscriber.on('error', (err) => {
      logger.error(`[PunishmentExpiry] Subscriber error: ${err.message}`);
    });

    subscriber.on('connect', () => {
      logger.info('[PunishmentExpiry] Subscriber connected.');
    });

    // Subscribe to expired key events on database 0
    await subscriber.subscribe('__keyevent@0__:expired');

    subscriber.on('message', async (channel, message) => {
      // Only handle punishment expiry keys
      if (!message.startsWith('punishment:expire:')) return;

      // Parse the key: punishment:expire:{guildId}:{caseId}
      const parts = message.split(':');
      if (parts.length < 4) return;

      const guildId = parts[2];
      const caseId = parseInt(parts[3], 10);

      if (isNaN(caseId)) return;

      logger.info(`[PunishmentExpiry] Key expired: ${message} (Guild: ${guildId}, Case: #${caseId})`);

      try {
        // Look up the case
        const punishment = await Punishment.findOne({ guildId, caseId });
        if (!punishment || !punishment.active) return;

        // Get the guild
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
          logger.warn(`[PunishmentExpiry] Guild ${guildId} not found in cache.`);
          return;
        }

        // Revert the action based on type
        switch (punishment.action) {
          case 'ban': {
            try {
              await guild.members.unban(punishment.userId, 'Punishment expired (auto-unban)');
              logger.info(`[PunishmentExpiry] Auto-unbanned ${punishment.userId} in guild ${guildId} (Case #${caseId})`);
            } catch (err) {
              logger.error(`[PunishmentExpiry] Failed to unban ${punishment.userId}: ${err.message}`);
            }
            break;
          }

          case 'mute': {
            try {
              const member = guild.members.cache.get(punishment.userId)
                || await guild.members.fetch(punishment.userId).catch(() => null);

              if (member) {
                await member.timeout(null, 'Punishment expired (auto-unmute)');
                logger.info(`[PunishmentExpiry] Auto-unmuted ${punishment.userId} in guild ${guildId} (Case #${caseId})`);
              }
            } catch (err) {
              logger.error(`[PunishmentExpiry] Failed to unmute ${punishment.userId}: ${err.message}`);
            }
            break;
          }

          default:
            break;
        }

        // Deactivate the case
        await caseManager.deactivateCase(guildId, caseId);
      } catch (err) {
        logger.error(`[PunishmentExpiry] Error processing expired punishment: ${err.message}`);
      }
    });

    // Store subscriber reference on client for graceful shutdown
    client.redisSubscriber = subscriber;
  },
};
