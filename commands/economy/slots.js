// ─────────────────────────────────────────────────────────────────────────────
// Command: /slots — Slot machine gambling
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const economyManager = require('../../services/economy/economyManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
const MULTIPLIERS = {
  '💎💎💎': 10,
  '7️⃣7️⃣7️⃣': 7,
  '🍇🍇🍇': 5,
  '🍊🍊🍊': 4,
  '🍋🍋🍋': 3,
  '🍒🍒🍒': 2,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play the slot machine')
    .addIntegerOption((option) =>
      option.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const bet = interaction.options.getInteger('bet');

    try {
      const balance = await economyManager.getBalance(interaction.guild.id, interaction.user.id);

      if (balance < bet) {
        return interaction.reply({
          embeds: [errorEmbed(`You don't have enough coins. Balance: **${balance.toLocaleString()}** coins.`)],
          ephemeral: true,
        });
      }

      // Spin the slots
      const results = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ];

      const resultKey = results.join('');
      const multiplier = MULTIPLIERS[resultKey] || 0;
      const winnings = multiplier > 0 ? bet * multiplier : 0;
      const netGain = winnings - bet;

      // Update balance
      await economyManager.addCoins(interaction.guild.id, interaction.user.id, netGain);

      const slotDisplay = `╔══════════╗\n║ ${results.join(' │ ')} ║\n╚══════════╝`;

      let description;
      let color;

      if (multiplier > 0) {
        description = `${slotDisplay}\n\n🎉 **YOU WON!** +${winnings.toLocaleString()} coins (x${multiplier})`;
        color = COLORS.success;
      } else if (results[0] === results[1] || results[1] === results[2]) {
        // Two matching — small consolation
        const consolation = Math.floor(bet * 0.5);
        await economyManager.addCoins(interaction.guild.id, interaction.user.id, consolation);
        description = `${slotDisplay}\n\n😐 **Close!** You got ${consolation.toLocaleString()} coins back.`;
        color = COLORS.warning;
      } else {
        description = `${slotDisplay}\n\n💸 **You lost** ${bet.toLocaleString()} coins.`;
        color = COLORS.error;
      }

      const embed = createEmbed({
        title: '🎰 Slot Machine',
        description,
        color,
        fields: [
          { name: 'Bet', value: `${bet.toLocaleString()} coins`, inline: true },
          { name: 'Balance', value: `${(balance + netGain).toLocaleString()} coins`, inline: true },
        ],
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Slots] ${interaction.user.tag} bet ${bet} — ${multiplier > 0 ? 'won' : 'lost'} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Slots] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred while playing slots.')], ephemeral: true });
    }
  },
};
