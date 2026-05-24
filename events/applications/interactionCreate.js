// ─────────────────────────────────────────────────────────────────────────────
// Event: interactionCreate — Handles application modal submissions
// ─────────────────────────────────────────────────────────────────────────────

const Application = require('../../database/models/Application');
const Guild = require('../../database/models/Guild');
const { createEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('application_')) return;

    const type = interaction.customId.replace('application_', '');

    try {
      // Get the questions for this application type
      const guildDoc = await Guild.findOne({ guildId: interaction.guild.id }).lean();
      const appConfig = guildDoc?.applications?.[type];

      if (!appConfig) {
        return interaction.reply({ embeds: [errorEmbed('Application type no longer exists.')], ephemeral: true });
      }

      const questions = appConfig.questions;
      const answers = [];

      for (let i = 0; i < questions.length; i++) {
        const answer = interaction.fields.getTextInputValue(`question_${i}`);
        answers.push({ question: questions[i], answer });
      }

      // Save application
      const application = await Application.create({
        guildId: interaction.guild.id,
        applicantId: interaction.user.id,
        type,
        answers,
      });

      await interaction.reply({
        embeds: [successEmbed(`Your **${type}** application has been submitted! ID: \`${application._id}\``)],
        ephemeral: true,
      });

      // Notify in logging channel if configured
      const logChannelId = guildDoc?.logging?.channels?.server;
      if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
        if (logChannel) {
          const fields = answers.map((a) => ({
            name: a.question,
            value: a.answer.substring(0, 1024),
            inline: false,
          }));

          const embed = createEmbed({
            title: `📋 New ${type} Application`,
            description: `**Applicant:** ${interaction.user.tag} (${interaction.user.id})`,
            color: COLORS.info,
            fields: [
              ...fields,
              { name: 'Application ID', value: `\`${application._id}\``, inline: true },
            ],
          });

          await logChannel.send({ embeds: [embed] });
        }
      }

      logger.info(`[Application] ${interaction.user.tag} submitted ${type} application in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Application] Error handling modal: ${err.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed('Failed to submit application.')], ephemeral: true }).catch(() => {});
      }
    }
  },
};
