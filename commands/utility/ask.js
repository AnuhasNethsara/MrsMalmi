// ─────────────────────────────────────────────────────────────────────────────
// Command: /ask — Ask the AI a question
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { chat, isAvailable } = require('../../services/ai/aiManager');
const { matchFAQ } = require('../../services/ai/faqMatcher');
const Guild = require('../../database/models/Guild');
const { createEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the AI a question')
    .addStringOption((option) =>
      option.setName('prompt').setDescription('Your question or prompt').setRequired(true)
    ),

  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const prompt = interaction.options.getString('prompt');

    try {
      // Check if AI is enabled for this guild
      const available = await isAvailable(interaction.guild.id);
      if (!available) {
        return interaction.reply({
          embeds: [infoEmbed('AI is not enabled for this server. An admin can enable it in the server settings.')],
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      // Check FAQ first for quick answers
      const guildDoc = await Guild.findOne({ guildId: interaction.guild.id }).lean();
      const faqs = guildDoc?.ai?.faq || [];

      if (faqs.length > 0) {
        const faqMatch = matchFAQ(prompt, faqs);
        if (faqMatch && faqMatch.score >= 0.5) {
          const embed = createEmbed({
            title: '📖 FAQ Match',
            description: faqMatch.answer,
            color: COLORS.info,
            fields: [
              { name: 'Matched Question', value: faqMatch.question, inline: false },
            ],
          });

          return interaction.editReply({ embeds: [embed] });
        }
      }

      // Call AI
      const result = await chat(prompt, interaction.guild.id, client);

      if (!result.success) {
        return interaction.editReply({
          embeds: [errorEmbed(result.response)],
        });
      }

      // Truncate response if too long for embed
      const response = result.response.length > 4000
        ? result.response.slice(0, 3997) + '...'
        : result.response;

      const embed = createEmbed({
        title: '🤖 AI Response',
        description: response,
        color: COLORS.primary,
        footer: `Asked by ${interaction.user.tag}`,
      });

      await interaction.editReply({ embeds: [embed] });
      logger.info(`[Ask] ${interaction.user.tag} asked AI in guild ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Ask] Error: ${err.message}`);
      const reply = { embeds: [errorEmbed('An error occurred while processing your question.')] };

      if (interaction.deferred) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply({ ...reply, ephemeral: true });
      }
    }
  },
};
