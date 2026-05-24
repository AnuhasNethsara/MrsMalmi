// ─────────────────────────────────────────────────────────────────────────────
// Command: /balance — Show coin balance
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance or another user\'s')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to check balance of').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const balance = await economyManager.getBalance(interaction.guild.id, target.id);

      const embed = createEmbed({
        title: '💰 Balance',
        description: `**${target.tag}** has **${balance.toLocaleString()}** coins.`,
        color: COLORS.primary,
        thumbnail: target.displayAvatarURL({ dynamic: true, size: 128 }),
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Balance] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch balance.')], ephemeral: true });
    }
  },
};
