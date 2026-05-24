// ─────────────────────────────────────────────────────────────────────────────
// Command: /shop — Show available items for purchase
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the server shop'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const items = await economyManager.getShopItems(interaction.guild.id);

      if (!items.length) {
        return interaction.reply({ embeds: [errorEmbed('The shop is empty. An admin needs to add items.')], ephemeral: true });
      }

      const description = items.map((item, index) => {
        return `**${index + 1}.** ${item.name} — 💰 ${item.price.toLocaleString()} coins\n> ${item.description || 'No description'}`;
      }).join('\n\n');

      const embed = createEmbed({
        title: '🛒 Server Shop',
        description,
        color: COLORS.primary,
        fields: [
          { name: 'How to buy', value: 'Use `/buy <item name>` to purchase an item.', inline: false },
        ],
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Shop] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to load the shop.')], ephemeral: true });
    }
  },
};
