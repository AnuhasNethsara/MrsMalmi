// ─────────────────────────────────────────────────────────────────────────────
// Event: channelDelete — Anti-Raid channel deletion spam detection
// ─────────────────────────────────────────────────────────────────────────────

const { AuditLogEvent } = require('discord.js');
const antiRaid = require('../../services/security/antiRaid');
const raidActions = require('../../services/security/raidActions');
const logger = require('../../utils/logger');

module.exports = {
  name: 'channelDelete',
  once: false,

  /**
   * @param {import('discord.js').DMChannel | import('discord.js').GuildChannel} channel
   * @param {import('discord.js').Client} client
   */
  async execute(channel, client) {
    try {
      // Ignore DM channels
      if (!channel.guild) return;

      const { guild } = channel;

      // Fetch audit log to find who deleted the channel
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1,
      }).catch(() => null);

      if (!auditLogs) return;

      const entry = auditLogs.entries.first();
      if (!entry) return;

      // Ensure the audit log entry is recent (within 5 seconds)
      const timeDiff = Date.now() - entry.createdTimestamp;
      if (timeDiff > 5000) return;

      const executor = entry.executor;
      if (!executor || executor.bot) return;

      // Check for deletion spam
      const result = await antiRaid.checkDeletionSpam(client, guild, executor, 'channel');

      if (result.triggered) {
        // Strip dangerous permissions from the executor
        await raidActions.stripPermissions(guild, executor.id);

        // Alert admins
        const Guild = require('../../database/models/Guild');
        const guildDoc = await Guild.findOne({ guildId: guild.id }).lean();
        const settings = guildDoc?.security?.antiRaid || {};

        await raidActions.alertAdmins(client, guild, settings,
          `⚠️ Mass channel deletion detected by <@${executor.id}> (${executor.tag}) — ${result.count} deletions. Permissions have been stripped.`
        );

        logger.warn(
          `[AntiRaid:channelDelete] Deletion spam by ${executor.tag} in guild ${guild.id} — permissions stripped`
        );
      }
    } catch (err) {
      logger.error(`[AntiRaid:channelDelete] Error: ${err.message}`);
    }
  },
};
