// ─────────────────────────────────────────────────────────────────────────────
// Command: /slowmode — Set channel slowmode
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set the slowmode for the current channel')
    .addIntegerOption((option) =>
      option
        .setName('seconds')
        .setDescription('Slowmode interval in seconds (0 to disable, max 21600)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  permissions: ['ManageChannels'],
  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);

      if (seconds === 0) {
        await interaction.reply({ embeds: [successEmbed('Slowmode has been disabled for this channel.')] });
      } else {
        await interaction.reply({ embeds: [successEmbed(`Slowmode set to **${seconds} second${seconds !== 1 ? 's' : ''}** for this channel.`)] });
      }

      logger.info(`[Slowmode] ${interaction.user.tag} set slowmode to ${seconds}s in #${interaction.channel.name} (${interaction.guild.id})`);
    } catch (err) {
      logger.error(`[Slowmode] Error setting slowmode: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to set slowmode. Please check my permissions.')], ephemeral: true });
    }
  },
};
