// ─────────────────────────────────────────────────────────────────────────────
// Event: interactionCreate — Handles suggestion upvote/downvote buttons
// ─────────────────────────────────────────────────────────────────────────────

const Suggestion = require('../../database/models/Suggestion');
const { createEmbed, errorEmbed } = require('../../utils/embed');
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
    if (!interaction.isButton()) return;

    const { customId } = interaction;
    if (!customId.startsWith('suggestion_')) return;

    try {
      const suggestion = await Suggestion.findOne({ messageId: interaction.message.id });
      if (!suggestion) return;

      if (suggestion.status !== 'pending') {
        return interaction.reply({ embeds: [errorEmbed('This suggestion has already been reviewed.')], ephemeral: true });
      }

      const userId = interaction.user.id;

      if (customId === 'suggestion_upvote') {
        // Remove from downvotes if present
        const downIndex = suggestion.votes.down.indexOf(userId);
        if (downIndex !== -1) suggestion.votes.down.splice(downIndex, 1);

        // Toggle upvote
        const upIndex = suggestion.votes.up.indexOf(userId);
        if (upIndex !== -1) {
          suggestion.votes.up.splice(upIndex, 1);
        } else {
          suggestion.votes.up.push(userId);
        }
      } else if (customId === 'suggestion_downvote') {
        // Remove from upvotes if present
        const upIndex = suggestion.votes.up.indexOf(userId);
        if (upIndex !== -1) suggestion.votes.up.splice(upIndex, 1);

        // Toggle downvote
        const downIndex = suggestion.votes.down.indexOf(userId);
        if (downIndex !== -1) {
          suggestion.votes.down.splice(downIndex, 1);
        } else {
          suggestion.votes.down.push(userId);
        }
      }

      await suggestion.save();

      // Update the embed
      const embed = createEmbed({
        title: '💡 New Suggestion',
        description: suggestion.content,
        color: COLORS.primary,
        fields: [
          { name: 'Status', value: '⏳ Pending', inline: true },
          { name: 'Suggested by', value: `<@${suggestion.userId}>`, inline: true },
          { name: 'Votes', value: `👍 ${suggestion.votes.up.length} | 👎 ${suggestion.votes.down.length}`, inline: true },
        ],
      });

      await interaction.update({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Suggestion] Error handling vote: ${err.message}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true }).catch(() => {});
      }
    }
  },
};
