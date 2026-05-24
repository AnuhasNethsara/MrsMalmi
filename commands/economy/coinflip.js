// ─────────────────────────────────────────────────────────────────────────────
// Command: /coinflip — Coin flip gambling
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin and bet on the outcome')
    .addIntegerOption((option) =>
      option.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10)
    )
    .addStringOption((option) =>
      option.setName('choice').setDescription('Heads or tails').setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' },
        )
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const bet = interaction.options.getInteger('bet');
    const choice = interaction.options.getString('choice');

    try {
      const balance = await economyManager.getBalance(interaction.guild.id, interaction.user.id);

      if (balance < bet) {
        return interaction.reply({
          embeds: [errorEmbed(`You don't have enough coins. Balance: **${balance.toLocaleString()}** coins.`)],
          ephemeral: true,
        });
      }

      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = result === choice;
      const netGain = won ? bet : -bet;

      await economyManager.addCoins(interaction.guild.id, interaction.user.id, netGain);

      const emoji = result === 'heads' ? '🪙' : '🪙';
      const embed = createEmbed({
        title: `${emoji} Coin Flip`,
        description: [
          `The coin landed on **${result}**!`,
          '',
          won
            ? `🎉 You won **${bet.toLocaleString()}** coins!`
            : `💸 You lost **${bet.toLocaleString()}** coins.`,
        ].join('\n'),
        color: won ? COLORS.success : COLORS.error,
        fields: [
          { name: 'Your Choice', value: choice, inline: true },
          { name: 'Result', value: result, inline: true },
          { name: 'Balance', value: `${(balance + netGain).toLocaleString()} coins`, inline: true },
        ],
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Coinflip] ${interaction.user.tag} bet ${bet} on ${choice} — ${won ? 'won' : 'lost'} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Coinflip] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true });
    }
  },
};
