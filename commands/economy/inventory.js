// ─────────────────────────────────────────────────────────────────────────────
// Command: /inventory — Show owned items
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory or another user\'s')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to check inventory of').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const inventory = await economyManager.getInventory(interaction.guild.id, target.id);

      if (!inventory.length) {
        return interaction.reply({
          embeds: [createEmbed({
            title: '🎒 Inventory',
            description: `**${target.tag}** has no items.`,
            color: COLORS.primary,
          })],
        });
      }

      const description = inventory.map((item, index) => {
        return `**${index + 1}.** ${item.name}`;
      }).join('\n');

      const embed = createEmbed({
        title: `🎒 ${target.tag}'s Inventory`,
        description,
        color: COLORS.primary,
        thumbnail: target.displayAvatarURL({ dynamic: true, size: 128 }),
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Inventory] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to load inventory.')], ephemeral: true });
    }
  },
};
