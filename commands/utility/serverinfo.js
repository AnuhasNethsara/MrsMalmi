// ─────────────────────────────────────────────────────────────────────────────
// Command: /serverinfo — Shows server information
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows information about the server'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const { guild } = interaction;

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;

    const embed = createEmbed({
      title: guild.name,
      thumbnail: guild.iconURL({ dynamic: true, size: 512 }),
      color: COLORS.info,
      fields: [
        { name: 'Owner', value: `${owner.user.tag}`, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Text Channels', value: `${textChannels}`, inline: true },
        { name: 'Voice Channels', value: `${voiceChannels}`, inline: true },
        { name: 'Categories', value: `${categories}`, inline: true },
        { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};
