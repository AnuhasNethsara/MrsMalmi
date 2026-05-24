// ─────────────────────────────────────────────────────────────────────────────
// Event: messageDelete — Logs deleted messages to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageDelete',
  once: false,

  /**
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client} client
   */
  async execute(message, client) {
    try {
      // Ignore partial messages, bots, and DMs
      if (message.partial) return;
      if (!message.guild) return;
      if (message.author?.bot) return;

      const content = message.content || '*No text content*';
      const fields = [
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Message ID', value: message.id, inline: true },
      ];

      // Include attachments if any
      if (message.attachments.size > 0) {
        const attachmentList = message.attachments.map(a => a.name || a.url).join('\n');
        fields.push({ name: 'Attachments', value: attachmentList, inline: false });
      }

      await logEvent(client, message.guild.id, 'messages', {
        action: 'Message Deleted',
        actor: `${message.author.tag} (${message.author.id})`,
        description: content.length > 1024 ? content.slice(0, 1021) + '...' : content,
        fields,
        thumbnail: message.author.displayAvatarURL({ dynamic: true }),
      });
    } catch (err) {
      logger.error(`[Logging:messageDelete] Error: ${err.message}`);
    }
  },
};
