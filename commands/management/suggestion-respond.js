// ─────────────────────────────────────────────────────────────────────────────
// Command: /suggestion-respond — Respond to a suggestion
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Suggestion = require('../../database/models/Suggestion');
const { createEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion-respond')
    .setDescription('Respond to a suggestion')
    .addStringOption((option) =>
      option.setName('id').setDescription('Suggestion message ID').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('status').setDescription('Approve or deny').setRequired(true)
        .addChoices(
          { name: 'Approve', value: 'approved' },
          { name: 'Deny', value: 'denied' },
        )
    )
    .addStringOption((option) =>
      option.setName('response').setDescription('Response message').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const messageId = interaction.options.getString('id');
    const status = interaction.options.getString('status');
    const response = interaction.options.getString('response');

    try {
      const suggestion = await Suggestion.findOne({ guildId: interaction.guild.id, messageId });

      if (!suggestion) {
        return interaction.reply({ embeds: [errorEmbed('Suggestion not found.')], ephemeral: true });
      }

      suggestion.status = status;
      suggestion.response = response;
      suggestion.respondedBy = interaction.user.id;
      await suggestion.save();

      // Update the suggestion message
      const channel = await client.channels.fetch(suggestion.channelId || interaction.channel.id).catch(() => null);
      if (channel) {
        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (message) {
          const statusColor = status === 'approved' ? COLORS.success : COLORS.error;
          const statusEmoji = status === 'approved' ? '✅' : '❌';

          const embed = createEmbed({
            title: `${statusEmoji} Suggestion ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            description: suggestion.content,
            color: statusColor,
            fields: [
              { name: 'Status', value: status.charAt(0).toUpperCase() + status.slice(1), inline: true },
              { name: 'Responded by', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Response', value: response, inline: false },
              { name: 'Votes', value: `👍 ${suggestion.votes.up.length} | 👎 ${suggestion.votes.down.length}`, inline: true },
            ],
          });

          await message.edit({ embeds: [embed], components: [] });
        }
      }

      await interaction.reply({ embeds: [successEmbed(`Suggestion ${status}!`)], ephemeral: true });
      logger.info(`[Suggestion] ${interaction.user.tag} ${status} suggestion ${messageId} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Suggestion] Error responding: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to respond to suggestion.')], ephemeral: true });
    }
  },
};
