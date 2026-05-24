// ─────────────────────────────────────────────────────────────────────────────
// Event: messageUpdate — Logs edited messages to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageUpdate',
  once: false,

  /**
   * @param {import('discord.js').Message} oldMessage
   * @param {import('discord.js').Message} newMessage
   * @param {import('discord.js').Client} client
   */
  async execute(oldMessage, newMessage, client) {
    try {
      // Ignore bots and DMs
      if (!newMessage.guild) return;
      if (newMessage.author?.bot) return;

      // Ignore partial messages
      if (oldMessage.partial || newMessage.partial) return;

      // Ignore embed-only updates (no content change)
      if (oldMessage.content === newMessage.content) return;

      const oldContent = oldMessage.content || '*Empty*';
      const newContent = newMessage.content || '*Empty*';

      const fields = [
        { name: 'Before', value: oldContent.length > 1024 ? oldContent.slice(0, 1021) + '...' : oldContent, inline: false },
        { name: 'After', value: newContent.length > 1024 ? newContent.slice(0, 1021) + '...' : newContent, inline: false },
        { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
        { name: 'Jump to Message', value: `[Click here](${newMessage.url})`, inline: true },
      ];

      await logEvent(client, newMessage.guild.id, 'messages', {
        action: 'Message Edited',
        actor: `${newMessage.author.tag} (${newMessage.author.id})`,
        fields,
        thumbnail: newMessage.author.displayAvatarURL({ dynamic: true }),
      });
    } catch (err) {
      logger.error(`[Logging:messageUpdate] Error: ${err.message}`);
    }
  },
};
