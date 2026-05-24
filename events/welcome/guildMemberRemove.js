// ─────────────────────────────────────────────────────────────────────────────
// Event: guildMemberRemove — Leave message handler
// ─────────────────────────────────────────────────────────────────────────────

const Guild = require('../../database/models/Guild');
const { sendLeave } = require('../../services/welcome/welcomeManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  once: false,

  /**
   * @param {import('discord.js').GuildMember} member
   * @param {import('discord.js').Client} client
   */
  async execute(member, client) {
    try {
      // Ignore bots
      if (member.user.bot) return;

      // Fetch guild settings
      const guildDoc = await Guild.findOne({ guildId: member.guild.id }).lean();
      const settings = guildDoc?.welcome;

      // Check if welcome system is enabled
      if (!settings || !settings.enabled) return;

      // Send leave message
      await sendLeave(member.guild, member, settings);

      logger.info(`[Welcome] Processed leave for ${member.user.tag} in guild ${member.guild.id}`);
    } catch (err) {
      logger.error(`[Welcome:guildMemberRemove] Error for ${member.user?.tag}: ${err.message}`);
    }
  },
};
