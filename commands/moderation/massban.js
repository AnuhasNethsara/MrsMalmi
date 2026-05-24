// ─────────────────────────────────────────────────────────────────────────────
// Command: /massban — Ban multiple users by ID
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massban')
    .setDescription('Ban multiple users by their IDs (space-separated)')
    .addStringOption((option) =>
      option.setName('users').setDescription('User IDs separated by spaces').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  permissions: ['BanMembers'],
  cooldown: 30,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const usersInput = interaction.options.getString('users');
    const reason = interaction.options.getString('reason') || 'Mass ban';

    const userIds = usersInput.split(/\s+/).filter((id) => /^\d{17,20}$/.test(id));

    if (userIds.length === 0) {
      return interaction.reply({ embeds: [errorEmbed('No valid user IDs provided.')], ephemeral: true });
    }

    if (userIds.length > 50) {
      return interaction.reply({ embeds: [errorEmbed('Maximum 50 users per mass ban.')], ephemeral: true });
    }

    await interaction.deferReply();

    const results = { success: 0, failed: 0 };

    for (const userId of userIds) {
      try {
        await interaction.guild.members.ban(userId, { reason: `[Massban by ${interaction.user.tag}] ${reason}` });
        results.success++;
      } catch {
        results.failed++;
      }
    }

    const embed = createEmbed({
      title: '🔨 Mass Ban Complete',
      color: COLORS.moderation,
      fields: [
        { name: 'Banned', value: `${results.success}`, inline: true },
        { name: 'Failed', value: `${results.failed}`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
      ],
    });

    await interaction.editReply({ embeds: [embed] });
    logger.info(`[Massban] ${interaction.user.tag} banned ${results.success}/${userIds.length} users in ${interaction.guild.id}`);
  },
};
