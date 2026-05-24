// ─────────────────────────────────────────────────────────────────────────────
// Event: messageReactionRemove — Updates starboard when stars are removed
// ─────────────────────────────────────────────────────────────────────────────

const starboardManager = require('../../services/starboard/starboardManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageReactionRemove',
  once: false,

  /**
   * @param {import('discord.js').MessageReaction} reaction
   * @param {import('discord.js').User} user
   * @param {import('discord.js').Client} client
   */
  async execute(reaction, user, client) {
    // Only handle star emoji
    if (reaction.emoji.name !== '⭐') return;

    // Ignore DMs
    if (!reaction.message.guild) return;

    // Fetch partial reactions
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }

    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch {
        return;
      }
    }

    try {
      await starboardManager.handleStarRemove(reaction, client);
    } catch (err) {
      logger.error(`[Starboard] Error handling star remove: ${err.message}`);
    }
  },
};
