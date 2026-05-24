// ─────────────────────────────────────────────────────────────────────────────
// Command: /profile — Show user profile with stats
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View a user profile')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to view').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;

    try {
      let userDoc = await User.findOne({ guildId: interaction.guild.id, userId: target.id });
      if (!userDoc) {
        userDoc = await User.create({ guildId: interaction.guild.id, userId: target.id });
      }

      const fields = [
        { name: '📊 Level', value: `${userDoc.level}`, inline: true },
        { name: '✨ XP', value: `${userDoc.xp.toLocaleString()}`, inline: true },
        { name: '💰 Coins', value: `${userDoc.coins.toLocaleString()}`, inline: true },
        { name: '⭐ Reputation', value: `${userDoc.reputation}`, inline: true },
        { name: '💬 Messages', value: `${userDoc.totalMessages.toLocaleString()}`, inline: true },
        { name: '🔥 Daily Streak', value: `${userDoc.dailyStreak}`, inline: true },
      ];

      if (userDoc.marriedTo) {
        fields.push({ name: '💍 Married to', value: `<@${userDoc.marriedTo}>`, inline: true });
      }

      if (userDoc.bio) {
        fields.push({ name: '📝 Bio', value: userDoc.bio, inline: false });
      }

      const embed = createEmbed({
        title: `${target.tag}'s Profile`,
        color: COLORS.primary,
        fields,
        thumbnail: target.displayAvatarURL({ dynamic: true, size: 256 }),
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Profile] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to load profile.')], ephemeral: true });
    }
  },
};
