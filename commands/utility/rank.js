// ─────────────────────────────────────────────────────────────────────────────
// Command: /rank — Display a user's rank card
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { generateRankCard } = require('../../services/leveling/rankCard');
const { errorEmbed, infoEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your rank card or another user\'s rank')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to check (defaults to you)').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetMember = interaction.guild.members.cache.get(targetUser.id)
        || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.editReply({ embeds: [errorEmbed('Could not find that user in this server.')] });
      }

      // Fetch user data
      const userData = await User.findOne({ guildId: interaction.guild.id, userId: targetUser.id });

      if (!userData || userData.xp === 0) {
        return interaction.editReply({
          embeds: [infoEmbed(`${targetUser.tag} hasn't earned any XP yet.`)],
        });
      }

      // Calculate rank position
      const rank = await User.countDocuments({
        guildId: interaction.guild.id,
        xp: { $gt: userData.xp },
      }) + 1;

      // Generate rank card
      const cardBuffer = await generateRankCard(userData, targetMember, rank);

      if (!cardBuffer) {
        return interaction.editReply({ embeds: [errorEmbed('Failed to generate rank card.')] });
      }

      const attachment = new AttachmentBuilder(cardBuffer, { name: 'rank-card.png' });
      await interaction.editReply({ files: [attachment] });
    } catch (err) {
      logger.error(`[Rank] Error: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('An error occurred while fetching rank data.')] });
    }
  },
};
