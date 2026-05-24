// ─────────────────────────────────────────────────────────────────────────────
// Command: /kick — Kick a user from the server
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const punishmentManager = require('../../services/moderation/punishmentManager');
const { moderationEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to kick').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the kick').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  permissions: ['KickMembers'],
  cooldown: 0,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    // Prevent self-kick
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot kick yourself.')], ephemeral: true });
    }

    // Prevent kicking the bot
    if (target.id === client.user.id) {
      return interaction.reply({ embeds: [errorEmbed('I cannot kick myself.')], ephemeral: true });
    }

    // Fetch target member
    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: true });
    }

    // Check hierarchy
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('You cannot kick a member with equal or higher role.')], ephemeral: true });
    }

    if (!targetMember.kickable) {
      return interaction.reply({ embeds: [errorEmbed('I cannot kick this user. They may have a higher role than me.')], ephemeral: true });
    }

    try {
      const punishment = await punishmentManager.kick(client, interaction.guild, interaction.user, targetMember, reason);

      const embed = moderationEmbed({
        action: 'Kick',
        moderator: interaction.user.tag,
        target: target.tag,
        reason,
        caseId: punishment.caseId,
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Kick] ${interaction.user.tag} kicked ${target.tag} in ${interaction.guild.id} (Case #${punishment.caseId})`);
    } catch (err) {
      logger.error(`[Kick] Error kicking ${target.tag}: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to kick the user. Please check my permissions.')], ephemeral: true });
    }
  },
};
