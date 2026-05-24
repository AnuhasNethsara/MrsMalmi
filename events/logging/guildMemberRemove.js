// ─────────────────────────────────────────────────────────────────────────────
// Event: guildMemberRemove — Logs member leaves to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
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
      const { user, guild } = member;

      // Get roles the member had (excluding @everyone)
      const roles = member.roles.cache
        .filter(r => r.id !== guild.id)
        .map(r => `<@&${r.id}>`)
        .join(', ') || 'None';

      // Join date
      const joinedAt = member.joinedTimestamp
        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
        : 'Unknown';

      const fields = [
        { name: 'Joined Server', value: joinedAt, inline: true },
        { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
        { name: 'Roles', value: roles.length > 1024 ? roles.slice(0, 1021) + '...' : roles, inline: false },
      ];

      await logEvent(client, guild.id, 'members', {
        action: 'Member Left',
        target: `${user.tag} (${user.id})`,
        fields,
        thumbnail: user.displayAvatarURL({ dynamic: true }),
      });
    } catch (err) {
      logger.error(`[Logging:guildMemberRemove] Error: ${err.message}`);
    }
  },
};
