// ─────────────────────────────────────────────────────────────────────────────
// Event: roleDelete — Logs role deletion to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
const logger = require('../../utils/logger');

module.exports = {
  name: 'roleDelete',
  once: false,

  /**
   * @param {import('discord.js').Role} role
   * @param {import('discord.js').Client} client
   */
  async execute(role, client) {
    try {
      if (!role.guild) return;

      const fields = [
        { name: 'Name', value: role.name, inline: true },
        { name: 'Color', value: role.hexColor || 'Default', inline: true },
        { name: 'ID', value: role.id, inline: true },
      ];

      await logEvent(client, role.guild.id, 'server', {
        action: 'Role Deleted',
        target: `@${role.name}`,
        fields,
      });
    } catch (err) {
      logger.error(`[Logging:roleDelete] Error: ${err.message}`);
    }
  },
};
