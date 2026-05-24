// ─────────────────────────────────────────────────────────────────────────────
// Command: /pay — Transfer coins to another user
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfer coins to another user')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to pay').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Amount of coins to transfer').setRequired(true).setMinValue(1)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    try {
      const result = await economyManager.transfer(interaction.guild.id, interaction.user.id, target.id, amount);

      if (!result.success) {
        return interaction.reply({ embeds: [errorEmbed(result.message)], ephemeral: true });
      }

      await interaction.reply({
        embeds: [successEmbed(`You paid **${amount.toLocaleString()}** coins to **${target.tag}**.`)],
      });
      logger.info(`[Pay] ${interaction.user.tag} paid ${amount} coins to ${target.tag} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Pay] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to transfer coins.')], ephemeral: true });
    }
  },
};
