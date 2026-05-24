// ─────────────────────────────────────────────────────────────────────────────
// Event: channelDelete — Logs channel deletion to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { ChannelType } = require('discord.js');
const { logEvent } = require('../../services/logging/logger');
const logger = require('../../utils/logger');

const channelTypeNames = {
  [ChannelType.GuildText]: 'Text Channel',
  [ChannelType.GuildVoice]: 'Voice Channel',
  [ChannelType.GuildCategory]: 'Category',
  [ChannelType.GuildAnnouncement]: 'Announcement Channel',
  [ChannelType.GuildStageVoice]: 'Stage Channel',
  [ChannelType.GuildForum]: 'Forum Channel',
};

module.exports = {
  name: 'channelDelete',
  once: false,

  /**
   * @param {import('discord.js').GuildChannel} channel
   * @param {import('discord.js').Client} client
   */
  async execute(channel, client) {
    try {
      if (!channel.guild) return;

      const typeName = channelTypeNames[channel.type] || 'Channel';

      const fields = [
        { name: 'Name', value: channel.name, inline: true },
        { name: 'Type', value: typeName, inline: true },
        { name: 'ID', value: channel.id, inline: true },
      ];

      if (channel.parent) {
        fields.push({ name: 'Category', value: channel.parent.name, inline: true });
      }

      await logEvent(client, channel.guild.id, 'server', {
        action: 'Channel Deleted',
        target: `#${channel.name}`,
        fields,
      });
    } catch (err) {
      logger.error(`[Logging:channelDelete] Error: ${err.message}`);
    }
  },
};
