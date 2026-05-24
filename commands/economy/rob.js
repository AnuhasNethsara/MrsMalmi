// ─────────────────────────────────────────────────────────────────────────────
// Command: /rob — Attempt to steal coins from another user
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

/** @type {Map<string, number>} userId -> last rob timestamp */
const robCooldowns = new Map();
const ROB_COOLDOWN = 60 * 60 * 1000; // 1 hour

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to steal coins from another user')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to rob').setRequired(true)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot rob yourself.')], ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('You cannot rob a bot.')], ephemeral: true });
    }

    // Check cooldown
    const cooldownKey = `${interaction.guild.id}-${interaction.user.id}`;
    const lastRob = robCooldowns.get(cooldownKey);
    if (lastRob && Date.now() - lastRob < ROB_COOLDOWN) {
      const remaining = Math.ceil((ROB_COOLDOWN - (Date.now() - lastRob)) / 60000);
      return interaction.reply({
        embeds: [errorEmbed(`You need to wait **${remaining} minutes** before robbing again.`)],
        ephemeral: true,
      });
    }

    try {
      const targetBalance = await economyManager.getBalance(interaction.guild.id, target.id);

      if (targetBalance < 100) {
        return interaction.reply({ embeds: [errorEmbed('That user doesn\'t have enough coins to rob.')], ephemeral: true });
      }

      robCooldowns.set(cooldownKey, Date.now());

      // 50% chance of success
      const success = Math.random() < 0.5;

      if (success) {
        const stolen = Math.floor(Math.random() * Math.min(targetBalance * 0.3, 500)) + 50;
        await economyManager.addCoins(interaction.guild.id, interaction.user.id, stolen);
        await economyManager.addCoins(interaction.guild.id, target.id, -stolen);

        const embed = createEmbed({
          title: '🦹 Robbery Successful!',
          description: `You stole **${stolen.toLocaleString()}** coins from **${target.tag}**!`,
          color: COLORS.success,
        });

        await interaction.reply({ embeds: [embed] });
        logger.info(`[Rob] ${interaction.user.tag} robbed ${stolen} coins from ${target.tag} in ${interaction.guild.id}`);
      } else {
        const fine = Math.floor(Math.random() * 200) + 50;
        await economyManager.addCoins(interaction.guild.id, interaction.user.id, -fine);

        const embed = createEmbed({
          title: '🚔 Robbery Failed!',
          description: `You got caught trying to rob **${target.tag}** and paid a **${fine.toLocaleString()}** coin fine.`,
          color: COLORS.error,
        });

        await interaction.reply({ embeds: [embed] });
        logger.info(`[Rob] ${interaction.user.tag} failed to rob ${target.tag} (fined ${fine}) in ${interaction.guild.id}`);
      }
    } catch (err) {
      logger.error(`[Rob] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true });
    }
  },
};
