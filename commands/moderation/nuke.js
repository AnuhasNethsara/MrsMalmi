// ─────────────────────────────────────────────────────────────────────────────
// Command: /nuke — Clone channel and delete original (instant clear)
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Clone this channel and delete the original (clears all messages)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  permissions: ['ManageChannels'],
  cooldown: 30,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const channel = interaction.channel;
      const position = channel.position;

      // Clone the channel
      const newChannel = await channel.clone({
        reason: `Channel nuked by ${interaction.user.tag}`,
      });

      await newChannel.setPosition(position).catch(() => null);

      // Delete the original
      await channel.delete(`Nuked by ${interaction.user.tag}`);

      // Send confirmation in new channel
      await newChannel.send({ embeds: [successEmbed(`Channel nuked by **${interaction.user.tag}**. 💥`)] });

      logger.info(`[Nuke] ${interaction.user.tag} nuked #${channel.name} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Nuke] Error: ${err.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed('Failed to nuke the channel.')], ephemeral: true });
      }
    }
  },
};
