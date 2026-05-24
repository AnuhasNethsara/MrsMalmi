// ─────────────────────────────────────────────────────────────────────────────
// Command: /ban — Ban a user from the server
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const punishmentManager = require('../../services/moderation/punishmentManager');
const { moderationEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Ban duration (e.g. 7d, 24h) — leave empty for permanent').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  permissions: ['BanMembers'],
  cooldown: 0,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const duration = interaction.options.getString('duration') || null;

    // Prevent self-ban
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot ban yourself.')], ephemeral: true });
    }

    // Prevent banning the bot
    if (target.id === client.user.id) {
      return interaction.reply({ embeds: [errorEmbed('I cannot ban myself.')], ephemeral: true });
    }

    // Check target hierarchy
    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (targetMember) {
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ embeds: [errorEmbed('You cannot ban a member with equal or higher role.')], ephemeral: true });
      }
      if (!targetMember.bannable) {
        return interaction.reply({ embeds: [errorEmbed('I cannot ban this user. They may have a higher role than me.')], ephemeral: true });
      }
    }

    try {
      const punishment = await punishmentManager.ban(client, interaction.guild, interaction.user, target, reason, duration);

      const embed = moderationEmbed({
        action: 'Ban',
        moderator: interaction.user.tag,
        target: target.tag,
        reason,
        caseId: punishment.caseId,
        duration: duration || 'Permanent',
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Ban] ${interaction.user.tag} banned ${target.tag} in ${interaction.guild.id} (Case #${punishment.caseId})`);
    } catch (err) {
      logger.error(`[Ban] Error banning ${target.tag}: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to ban the user. Please check my permissions.')], ephemeral: true });
    }
  },
};
