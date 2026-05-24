// ─────────────────────────────────────────────────────────────────────────────
// Event: guildMemberAdd — Detect unauthorized bot additions
// ─────────────────────────────────────────────────────────────────────────────

const { AuditLogEvent } = require('discord.js');
const Guild = require('../../database/models/Guild');
const raidActions = require('../../services/security/raidActions');
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
      // Only handle bot additions
      if (!member.user.bot) return;

      const { guild } = member;

      // Fetch guild settings
      const guildDoc = await Guild.findOne({ guildId: guild.id }).lean();
      const settings = guildDoc?.security?.antiRaid;

      // Check if anti-raid is enabled
      if (!settings || !settings.enabled) return;

      // Fetch audit log to find who added the bot
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.BotAdd,
        limit: 1,
      }).catch(() => null);

      if (!auditLogs) return;

      const entry = auditLogs.entries.first();
      if (!entry) return;

      // Ensure the audit log entry is recent (within 10 seconds)
      const timeDiff = Date.now() - entry.createdTimestamp;
      if (timeDiff > 10000) return;

      const executor = entry.executor;
      if (!executor) return;

      // Check if the bot adder is whitelisted
      const whitelistedUsers = settings.whitelistedUsers || [];
      if (whitelistedUsers.includes(executor.id)) {
        logger.info(
          `[AntiRaid:guildBotAdd] Whitelisted user ${executor.tag} added bot ${member.user.tag} to guild ${guild.id}`
        );
        return;
      }

      // Not whitelisted — kick the bot
      if (member.kickable) {
        await member.kick('[AntiRaid] Unauthorized bot addition');
        logger.warn(
          `[AntiRaid:guildBotAdd] Kicked unauthorized bot ${member.user.tag} added by ${executor.tag} in guild ${guild.id}`
        );
      }

      // Alert admins
      const alertSettings = {
        alertChannelId: settings.alertChannelId || null,
        action: settings.action || 'lockdown',
      };

      await raidActions.alertAdmins(client, guild, alertSettings,
        `🤖 Unauthorized bot addition detected!\n\n**Bot:** ${member.user.tag} (\`${member.user.id}\`)\n**Added by:** <@${executor.id}> (${executor.tag})\n\nThe bot has been kicked. The user who added it is not whitelisted.`
      );
    } catch (err) {
      logger.error(`[AntiRaid:guildBotAdd] Error: ${err.message}`);
    }
  },
};
