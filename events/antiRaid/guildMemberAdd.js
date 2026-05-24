// ─────────────────────────────────────────────────────────────────────────────
// Event: guildMemberAdd — Anti-Raid join spam detection
// ─────────────────────────────────────────────────────────────────────────────

const antiRaid = require('../../services/security/antiRaid');
const raidActions = require('../../services/security/raidActions');
const Guild = require('../../database/models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  /**
   * @param {import('discord.js').GuildMember} member
   * @param {import('discord.js').Client} client
   */
  async execute(member, client) {
    try {
      const { guild } = member;

      // Fetch guild settings
      const guildDoc = await Guild.findOne({ guildId: guild.id }).lean();
      const settings = guildDoc?.security?.antiRaid;

      // Check if anti-raid is enabled
      if (!settings || !settings.enabled) return;

      // Check for join spam
      const result = await antiRaid.checkJoinSpam(client, guild, member);

      if (result.triggered) {
        // Build full settings object for raidActions
        const fullSettings = {
          action: settings.action || 'lockdown',
          alertChannelId: settings.alertChannelId || null,
          whitelistedUsers: settings.whitelistedUsers || [],
        };

        await raidActions.handleRaid(client, guild, fullSettings);
      }
    } catch (err) {
      logger.error(`[AntiRaid:guildMemberAdd] Error: ${err.message}`);
    }
  },
};
