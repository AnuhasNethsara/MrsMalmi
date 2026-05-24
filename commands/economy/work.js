// ─────────────────────────────────────────────────────────────────────────────
// Command: /work — Earn random coins with a cooldown
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

/** @type {Map<string, number>} key -> last work timestamp */
const workCooldowns = new Map();
const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour

const WORK_MESSAGES = [
  'You worked as a programmer and earned',
  'You delivered pizzas and earned',
  'You mowed lawns in the neighborhood and earned',
  'You worked a shift at the coffee shop and earned',
  'You drove for a rideshare service and earned',
  'You tutored students online and earned',
  'You walked dogs in the park and earned',
  'You freelanced as a designer and earned',
  'You worked at the library and earned',
  'You helped move furniture and earned',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn some coins (1 hour cooldown)'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const cooldownKey = `${interaction.guild.id}-${interaction.user.id}`;
    const lastWork = workCooldowns.get(cooldownKey);

    if (lastWork && Date.now() - lastWork < WORK_COOLDOWN) {
      const remaining = Math.ceil((WORK_COOLDOWN - (Date.now() - lastWork)) / 60000);
      return interaction.reply({
        embeds: [errorEmbed(`You need to rest! Come back in **${remaining} minutes**.`)],
        ephemeral: true,
      });
    }

    try {
      const earnings = Math.floor(Math.random() * 200) + 100; // 100-300 coins
      await economyManager.addCoins(interaction.guild.id, interaction.user.id, earnings);
      workCooldowns.set(cooldownKey, Date.now());

      const message = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];
      const newBalance = await economyManager.getBalance(interaction.guild.id, interaction.user.id);

      const embed = createEmbed({
        title: '💼 Work',
        description: `${message} **${earnings.toLocaleString()}** coins!`,
        color: COLORS.success,
        fields: [
          { name: 'Balance', value: `${newBalance.toLocaleString()} coins`, inline: true },
        ],
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Work] ${interaction.user.tag} earned ${earnings} coins in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Work] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred while working.')], ephemeral: true });
    }
  },
};
