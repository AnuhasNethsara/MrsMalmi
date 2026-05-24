// ─────────────────────────────────────────────────────────────────────────────
// Command: /apply — Open an application modal
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Submit an application')
    .addStringOption((option) =>
      option.setName('type').setDescription('Application type (e.g. staff, moderator)').setRequired(true)
    ),

  cooldown: 60,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const type = interaction.options.getString('type').toLowerCase();

    try {
      const guildDoc = await Guild.findOne({ guildId: interaction.guild.id }).lean();
      const appConfig = guildDoc?.applications?.[type];

      if (!appConfig || !appConfig.enabled) {
        return interaction.reply({
          embeds: [errorEmbed(`Application type \`${type}\` not found. Ask an admin to set it up with \`/setapplication\`.`)],
          ephemeral: true,
        });
      }

      const questions = appConfig.questions;

      // Build modal
      const modal = new ModalBuilder()
        .setCustomId(`application_${type}`)
        .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Application`);

      for (let i = 0; i < Math.min(questions.length, 5); i++) {
        const input = new TextInputBuilder()
          .setCustomId(`question_${i}`)
          .setLabel(questions[i].substring(0, 45))
          .setStyle(questions[i].length > 50 ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(1000);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
      }

      await interaction.showModal(modal);
      logger.info(`[Application] ${interaction.user.tag} opened ${type} application modal in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Application] Error showing modal: ${err.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed('Failed to open application form.')], ephemeral: true });
      }
    }
  },
};
