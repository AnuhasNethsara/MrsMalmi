// ─────────────────────────────────────────────────────────────────────────────
// Event: roleUpdate — Logs role updates to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
const logger = require('../../utils/logger');

module.exports = {
  name: 'roleUpdate',
  once: false,

  /**
   * @param {import('discord.js').Role} oldRole
   * @param {import('discord.js').Role} newRole
   * @param {import('discord.js').Client} client
   */
  async execute(oldRole, newRole, client) {
    try {
      if (!newRole.guild) return;

      const changes = [];

      if (oldRole.name !== newRole.name) {
        changes.push({ name: 'Name', value: `${oldRole.name} → ${newRole.name}`, inline: false });
      }

      if (oldRole.hexColor !== newRole.hexColor) {
        changes.push({ name: 'Color', value: `${oldRole.hexColor} → ${newRole.hexColor}`, inline: true });
      }

      if (oldRole.hoist !== newRole.hoist) {
        changes.push({ name: 'Hoisted', value: `${oldRole.hoist} → ${newRole.hoist}`, inline: true });
      }

      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push({ name: 'Mentionable', value: `${oldRole.mentionable} → ${newRole.mentionable}`, inline: true });
      }

      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        changes.push({ name: 'Permissions', value: 'Permissions were modified', inline: false });
      }

      // Only log if there are meaningful changes
      if (changes.length === 0) return;

      const fields = [
        { name: 'Role', value: `<@&${newRole.id}> (${newRole.id})`, inline: false },
        ...changes,
      ];

      await logEvent(client, newRole.guild.id, 'server', {
        action: 'Role Updated',
        target: `@${newRole.name}`,
        fields,
      });
    } catch (err) {
      logger.error(`[Logging:roleUpdate] Error: ${err.message}`);
    }
  },
};
