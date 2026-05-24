// ─────────────────────────────────────────────────────────────────────────────
// Command: /customcmd-remove — Delete a custom command
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const CustomCommand = require('../../database/models/CustomCommand');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcmd-remove')
    .setDescription('Delete a custom command')
    .addStringOption((option) =>
      option.setName('name').setDescription('Command name to delete').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const name = interaction.options.getString('name').toLowerCase();

    try {
      const result = await CustomCommand.findOneAndDelete({ guildId: interaction.guild.id, name });

      if (!result) {
        return interaction.reply({ embeds: [errorEmbed(`Custom command \`${name}\` not found.`)], ephemeral: true });
      }

      await interaction.reply({ embeds: [successEmbed(`Custom command \`${name}\` deleted.`)] });
      logger.info(`[CustomCmd] ${interaction.user.tag} deleted command "${name}" in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[CustomCmd] Error deleting command: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to delete custom command.')], ephemeral: true });
    }
  },
};
