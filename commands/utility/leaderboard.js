// ─────────────────────────────────────────────────────────────────────────────
// Command: /leaderboard — Display the top 10 users by XP in the guild
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { createEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top 10 users by XP in this server'),

  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Query top 10 users by XP in this guild
      const topUsers = await User.find({ guildId: interaction.guild.id })
        .sort({ xp: -1 })
        .limit(10)
        .lean();

      if (!topUsers || topUsers.length === 0) {
        return interaction.editReply({
          embeds: [infoEmbed('No one has earned XP in this server yet.')],
        });
      }

      // Build leaderboard entries
      const entries = [];
      for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;

        // Try to fetch the member for display name
        let displayName;
        try {
          const member = interaction.guild.members.cache.get(user.userId)
            || await interaction.guild.members.fetch(user.userId).catch(() => null);
          displayName = member ? member.user.tag : `<@${user.userId}>`;
        } catch {
          displayName = `<@${user.userId}>`;
        }

        entries.push(
          `${medal} ${displayName}\n` +
          `   Level **${user.level}** • ${user.xp.toLocaleString()} XP • ${user.totalMessages.toLocaleString()} messages`
        );
      }

      const embed = createEmbed({
        title: `🏆 ${interaction.guild.name} — Leaderboard`,
        description: entries.join('\n\n'),
        color: COLORS.primary,
        thumbnail: interaction.guild.iconURL({ dynamic: true, size: 128 }),
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`[Leaderboard] Error: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('An error occurred while fetching the leaderboard.')] });
    }
  },
};
