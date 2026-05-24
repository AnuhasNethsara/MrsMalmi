// ─────────────────────────────────────────────────────────────────────────────
// Command: /customcmd add — Create a custom text command
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const CustomCommand = require('../../database/models/CustomCommand');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcmd')
    .setDescription('Create a custom text command')
    .addStringOption((option) =>
      option.setName('name').setDescription('Command name (no spaces)').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('response').setDescription('Response text').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const name = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '');
    const response = interaction.options.getString('response');

    try {
      // Check if command already exists
      const existing = await CustomCommand.findOne({ guildId: interaction.guild.id, name });
      if (existing) {
        return interaction.reply({ embeds: [errorEmbed(`A custom command with the name \`${name}\` already exists.`)], ephemeral: true });
      }

      await CustomCommand.create({
        guildId: interaction.guild.id,
        name,
        response,
        createdBy: interaction.user.id,
      });

      await interaction.reply({
        embeds: [successEmbed(`Custom command \`${name}\` created! Use it with your server prefix.`)],
      });

      logger.info(`[CustomCmd] ${interaction.user.tag} created command "${name}" in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[CustomCmd] Error creating command: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to create custom command.')], ephemeral: true });
    }
  },
};
