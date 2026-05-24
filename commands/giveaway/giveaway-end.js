// ─────────────────────────────────────────────────────────────────────────────
// Command: /giveaway-end — End a giveaway early
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Giveaway = require('../../database/models/Giveaway');
const giveawayManager = require('../../services/giveaway/giveawayManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway-end')
    .setDescription('End a giveaway early')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Message ID of the giveaway').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const messageId = interaction.options.getString('messageid');

    try {
      const giveaway = await Giveaway.findOne({ guildId: interaction.guild.id, messageId });

      if (!giveaway) {
        return interaction.reply({ embeds: [errorEmbed('Giveaway not found.')], ephemeral: true });
      }

      if (giveaway.ended) {
        return interaction.reply({ embeds: [errorEmbed('This giveaway has already ended.')], ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const winners = await giveawayManager.endGiveaway(giveaway, client);
      const winnersText = winners.length > 0
        ? winners.map((id) => `<@${id}>`).join(', ')
        : 'No winners (no entries)';

      await interaction.editReply({
        embeds: [successEmbed(`Giveaway ended! Winners: ${winnersText}`)],
      });

      logger.info(`[Giveaway] ${interaction.user.tag} ended giveaway ${messageId} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Giveaway] Error ending giveaway: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Failed to end giveaway.')] });
    }
  },
};
