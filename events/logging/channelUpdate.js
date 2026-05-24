// ─────────────────────────────────────────────────────────────────────────────
// Event: channelUpdate — Logs channel updates to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
const logger = require('../../utils/logger');

module.exports = {
  name: 'channelUpdate',
  once: false,

  /**
   * @param {import('discord.js').GuildChannel} oldChannel
   * @param {import('discord.js').GuildChannel} newChannel
   * @param {import('discord.js').Client} client
   */
  async execute(oldChannel, newChannel, client) {
    try {
      if (!newChannel.guild) return;

      const changes = [];

      if (oldChannel.name !== newChannel.name) {
        changes.push({ name: 'Name', value: `${oldChannel.name} → ${newChannel.name}`, inline: false });
      }

      if (oldChannel.topic !== newChannel.topic) {
        const oldTopic = oldChannel.topic || '*None*';
        const newTopic = newChannel.topic || '*None*';
        changes.push({ name: 'Topic', value: `${oldTopic} → ${newTopic}`, inline: false });
      }

      if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push({ name: 'NSFW', value: `${oldChannel.nsfw} → ${newChannel.nsfw}`, inline: true });
      }

      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push({ name: 'Slowmode', value: `${oldChannel.rateLimitPerUser || 0}s → ${newChannel.rateLimitPerUser || 0}s`, inline: true });
      }

      if (oldChannel.parentId !== newChannel.parentId) {
        const oldCat = oldChannel.parent?.name || 'None';
        const newCat = newChannel.parent?.name || 'None';
        changes.push({ name: 'Category', value: `${oldCat} → ${newCat}`, inline: true });
      }

      // Only log if there are meaningful changes
      if (changes.length === 0) return;

      const fields = [
        { name: 'Channel', value: `<#${newChannel.id}> (${newChannel.id})`, inline: false },
        ...changes,
      ];

      await logEvent(client, newChannel.guild.id, 'server', {
        action: 'Channel Updated',
        target: `#${newChannel.name}`,
        fields,
      });
    } catch (err) {
      logger.error(`[Logging:channelUpdate] Error: ${err.message}`);
    }
  },
};
