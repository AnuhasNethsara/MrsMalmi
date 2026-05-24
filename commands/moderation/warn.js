// ─────────────────────────────────────────────────────────────────────────────
// Command: /warn — Warn a user
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const punishmentManager = require('../../services/moderation/punishmentManager');
const { moderationEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to warn').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the warning').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  permissions: ['ModerateMembers'],
  cooldown: 0,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    // Prevent warning bots
    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('You cannot warn a bot.')], ephemeral: true });
    }

    // Prevent self-warn
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot warn yourself.')], ephemeral: true });
    }

    // Check hierarchy
    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('You cannot warn a member with equal or higher role.')], ephemeral: true });
    }

    try {
      const punishment = await punishmentManager.warn(client, interaction.guild, interaction.user, target, reason);

      const embed = moderationEmbed({
        action: 'Warn',
        moderator: interaction.user.tag,
        target: target.tag,
        reason,
        caseId: punishment.caseId,
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Warn] ${interaction.user.tag} warned ${target.tag} in ${interaction.guild.id} (Case #${punishment.caseId})`);
    } catch (err) {
      logger.error(`[Warn] Error warning ${target.tag}: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to warn the user.')], ephemeral: true });
    }
  },
};
