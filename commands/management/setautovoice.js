// ─────────────────────────────────────────────────────────────────────────────
// Command: /setautovoice — Set the "join to create" voice channel
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setautovoice')
    .setDescription('Set the "join to create" voice channel')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Voice channel to use as creator').setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  permissions: ['ManageChannels'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    try {
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $set: { 'autoVoice.channelId': channel.id } },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Auto voice channel set to **${channel.name}**. Users who join will get a temporary channel.`)],
      });

      logger.info(`[AutoVoice] ${interaction.user.tag} set auto voice to ${channel.name} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[AutoVoice] Error setting channel: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to set auto voice channel.')], ephemeral: true });
    }
  },
};
