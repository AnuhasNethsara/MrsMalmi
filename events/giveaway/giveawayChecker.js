// ─────────────────────────────────────────────────────────────────────────────
// Event: giveawayChecker — Checks for ended giveaways every 30 seconds
// ─────────────────────────────────────────────────────────────────────────────

const { Events } = require('discord.js');
const Giveaway = require('../../database/models/Giveaway');
const giveawayManager = require('../../services/giveaway/giveawayManager');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    console.log('[Giveaways] Starting giveaway checker (interval: 30s)');

    setInterval(async () => {
      try {
        const dueGiveaways = await Giveaway.find({
          ended: false,
          endsAt: { $lte: new Date() },
        }).limit(10);

        for (const giveaway of dueGiveaways) {
          try {
            await giveawayManager.endGiveaway(giveaway, client);
          } catch (err) {
            logger.error(`[Giveaways] Error ending giveaway ${giveaway._id}: ${err.message}`);
            // Mark as ended to prevent infinite retries
            giveaway.ended = true;
            await giveaway.save();
          }
        }
      } catch (err) {
        logger.error(`[Giveaways] Error checking giveaways: ${err.message}`);
      }
    }, 30000);
  },
};
