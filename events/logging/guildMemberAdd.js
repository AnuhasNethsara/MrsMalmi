// ─────────────────────────────────────────────────────────────────────────────
// Event: guildMemberAdd — Logs member joins to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
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
      const { user, guild } = member;

      // Calculate account age
      const accountAge = Date.now() - user.createdTimestamp;
      const days = Math.floor(accountAge / (1000 * 60 * 60 * 24));
      const accountAgeStr = days < 1 ? 'Less than a day' : `${days} day${days !== 1 ? 's' : ''}`;

      const memberCount = guild.memberCount;

      const fields = [
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Account Age', value: accountAgeStr, inline: true },
        { name: 'Member Count', value: `${memberCount}`, inline: true },
      ];

      await logEvent(client, guild.id, 'members', {
        action: 'Member Joined',
        target: `${user.tag} (${user.id})`,
        fields,
        thumbnail: user.displayAvatarURL({ dynamic: true }),
      });
    } catch (err) {
      logger.error(`[Logging:guildMemberAdd] Error: ${err.message}`);
    }
  },
};
