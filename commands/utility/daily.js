// ─────────────────────────────────────────────────────────────────────────────
// Command: /daily — Claim daily coins with streak bonus
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS, LEVELING } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coins and maintain your streak'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;

      // Get or create user document
      let userDoc = await User.findOne({ guildId, userId });
      if (!userDoc) {
        userDoc = await User.create({ guildId, userId });
      }

      // Check if daily has already been claimed today
      const now = new Date();
      if (userDoc.lastDaily) {
        const lastClaim = new Date(userDoc.lastDaily);
        const hoursSinceClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

        if (hoursSinceClaim < 24) {
          const hoursLeft = Math.ceil(24 - hoursSinceClaim);
          const minutesLeft = Math.ceil((24 - hoursSinceClaim) * 60) % 60;

          return interaction.reply({
            embeds: [errorEmbed(`You've already claimed your daily! Come back in **${hoursLeft}h ${minutesLeft}m**.`)],
            ephemeral: true,
          });
        }

        // Check if streak should be maintained (within 48 hours) or reset
        if (hoursSinceClaim > 48) {
          // Streak broken — reset
          userDoc.dailyStreak = 0;
        }
      }

      // Calculate rewards
      const baseCoins = LEVELING.dailyCoins;
      const newStreak = userDoc.dailyStreak + 1;
      const streakBonus = (newStreak - 1) * LEVELING.streakBonus;
      const totalCoins = baseCoins + streakBonus;

      // Update user document
      await User.updateOne(
        { guildId, userId },
        {
          $inc: { coins: totalCoins },
          $set: {
            dailyStreak: newStreak,
            lastDaily: now,
          },
        }
      );

      // Build response embed
      const embed = createEmbed({
        title: '💰 Daily Reward Claimed!',
        description: [
          `**Base Reward:** ${baseCoins} coins`,
          streakBonus > 0 ? `**Streak Bonus:** +${streakBonus} coins (${newStreak} day streak 🔥)` : null,
          `\n**Total:** ${totalCoins} coins`,
          `**Balance:** ${(userDoc.coins + totalCoins).toLocaleString()} coins`,
          `\n**Streak:** ${newStreak} day${newStreak > 1 ? 's' : ''} 🔥`,
        ].filter(Boolean).join('\n'),
        color: COLORS.success,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true, size: 128 }),
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Daily] ${interaction.user.tag} claimed daily (streak: ${newStreak}) in guild ${guildId}`);
    } catch (err) {
      logger.error(`[Daily] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred while claiming your daily reward.')], ephemeral: true });
    }
  },
};
