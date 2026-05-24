// ─────────────────────────────────────────────────────────────────────────────
// Event: messageCreate — Leveling XP grant handler
// ─────────────────────────────────────────────────────────────────────────────

const { grantMessageXP } = require('../../services/leveling/levelManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,

  /**
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client} client
   */
  async execute(message, client) {
    try {
      // Ignore bots
      if (message.author.bot) return;

      // Ignore DMs
      if (!message.guild) return;

      // Grant XP for the message
      await grantMessageXP(message, client);
    } catch (err) {
      logger.error(`[Leveling:messageCreate] Error: ${err.message}`);
    }
  },
};
