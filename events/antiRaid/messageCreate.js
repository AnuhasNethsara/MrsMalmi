// ─────────────────────────────────────────────────────────────────────────────
// Event: messageCreate — Anti-Raid mention spam detection
// ─────────────────────────────────────────────────────────────────────────────

const antiRaid = require('../../services/security/antiRaid');
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
      // Ignore bots and DMs
      if (message.author.bot) return;
      if (!message.guild) return;

      // Check for mention spam
      const result = await antiRaid.checkMentionSpam(message);

      if (result.triggered) {
        // Timeout the user for 5 minutes (300000ms)
        const member = message.member;
        if (member && member.moderatable) {
          await member.timeout(5 * 60 * 1000, '[AntiRaid] Mention spam detected');
          logger.info(
            `[AntiRaid:messageCreate] Timed out ${message.author.tag} in guild ${message.guild.id} for mention spam (${result.count} mentions)`
          );
        }

        // Delete the offending message
        if (message.deletable) {
          await message.delete().catch(() => {});
          logger.info(
            `[AntiRaid:messageCreate] Deleted mention spam message from ${message.author.tag} in guild ${message.guild.id}`
          );
        }
      }
    } catch (err) {
      logger.error(`[AntiRaid:messageCreate] Error: ${err.message}`);
    }
  },
};
