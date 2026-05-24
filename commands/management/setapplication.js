// ─────────────────────────────────────────────────────────────────────────────
// Command: /setapplication — Create an application type with questions
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setapplication')
    .setDescription('Create an application type with questions')
    .addStringOption((option) =>
      option.setName('type').setDescription('Application type name (e.g. staff, moderator)').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('questions').setDescription('Questions separated by commas').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const type = interaction.options.getString('type').toLowerCase();
    const questionsRaw = interaction.options.getString('questions');
    const questions = questionsRaw.split(',').map((q) => q.trim()).filter(Boolean);

    if (questions.length === 0) {
      return interaction.reply({ embeds: [errorEmbed('You must provide at least one question.')], ephemeral: true });
    }

    if (questions.length > 5) {
      return interaction.reply({ embeds: [errorEmbed('Maximum 5 questions allowed (modal limitation).')], ephemeral: true });
    }

    try {
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          $set: { [`applications.${type}`]: { questions, enabled: true } },
        },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Application type **${type}** created with ${questions.length} question(s).\nUsers can apply with \`/apply ${type}\`.`)],
      });

      logger.info(`[Application] ${interaction.user.tag} created application type "${type}" in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Application] Error creating type: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to create application type.')], ephemeral: true });
    }
  },
};
