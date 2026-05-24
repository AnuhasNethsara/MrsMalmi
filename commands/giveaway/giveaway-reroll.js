// ─────────────────────────────────────────────────────────────────────────────
// Command: /giveaway-reroll — Pick new winners for an ended giveaway
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const giveawayManager = require('../../services/giveaway/giveawayManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway-reroll')
    .setDescription('Pick new winners for an ended giveaway')
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
      const result = await giveawayManager.rerollGiveaway(interaction.guild.id, messageId, client);

      if (!result.success) {
        return interaction.reply({ embeds: [errorEmbed(result.message)], ephemeral: true });
      }

      const winnersText = result.winners.map((id) => `<@${id}>`).join(', ');
      await interaction.reply({ embeds: [successEmbed(`Rerolled! New winners: ${winnersText}`)] });

      logger.info(`[Giveaway] ${interaction.user.tag} rerolled giveaway ${messageId} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Giveaway] Error rerolling giveaway: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to reroll giveaway.')], ephemeral: true });
    }
  },
};
