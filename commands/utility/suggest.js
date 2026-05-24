// ─────────────────────────────────────────────────────────────────────────────
// Command: /suggest — Create a suggestion with voting buttons
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Suggestion = require('../../database/models/Suggestion');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption((option) =>
      option.setName('content').setDescription('Your suggestion').setRequired(true)
    ),

  cooldown: 30,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const content = interaction.options.getString('content');

    try {
      const embed = createEmbed({
        title: '💡 New Suggestion',
        description: content,
        color: COLORS.primary,
        fields: [
          { name: 'Status', value: '⏳ Pending', inline: true },
          { name: 'Suggested by', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Votes', value: '👍 0 | 👎 0', inline: true },
        ],
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('suggestion_upvote')
          .setLabel('👍 Upvote')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('suggestion_downvote')
          .setLabel('👎 Downvote')
          .setStyle(ButtonStyle.Danger),
      );

      const message = await interaction.channel.send({ embeds: [embed], components: [row] });

      await Suggestion.create({
        guildId: interaction.guild.id,
        messageId: message.id,
        userId: interaction.user.id,
        content,
      });

      await interaction.reply({ embeds: [createEmbed({ description: '✅ Your suggestion has been submitted!', color: COLORS.success })], ephemeral: true });
      logger.info(`[Suggestion] ${interaction.user.tag} submitted a suggestion in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Suggestion] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to submit suggestion.')], ephemeral: true });
    }
  },
};
