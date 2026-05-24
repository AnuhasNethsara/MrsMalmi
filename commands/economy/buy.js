// ─────────────────────────────────────────────────────────────────────────────
// Command: /buy — Purchase an item from the shop
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase an item from the shop')
    .addStringOption((option) =>
      option.setName('item').setDescription('Name of the item to buy').setRequired(true)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const itemName = interaction.options.getString('item');

    try {
      const result = await economyManager.buyItem(interaction.guild.id, interaction.user.id, itemName);

      if (!result.success) {
        return interaction.reply({ embeds: [errorEmbed(result.message)], ephemeral: true });
      }

      await interaction.reply({ embeds: [successEmbed(result.message)] });
      logger.info(`[Buy] ${interaction.user.tag} purchased "${itemName}" in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Buy] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to purchase item.')], ephemeral: true });
    }
  },
};
