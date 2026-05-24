// ─────────────────────────────────────────────────────────────────────────────
// Command: /unmute — Remove timeout from a user
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const punishmentManager = require('../../services/moderation/punishmentManager');
const { moderationEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to unmute').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the unmute').setRequired(true)
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

    // Fetch target member
    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: true });
    }

    // Check if user is actually timed out
    if (!targetMember.isCommunicationDisabled()) {
      return interaction.reply({ embeds: [errorEmbed('This user is not currently muted.')], ephemeral: true });
    }

    if (!targetMember.moderatable) {
      return interaction.reply({ embeds: [errorEmbed('I cannot unmute this user. They may have a higher role than me.')], ephemeral: true });
    }

    try {
      const punishment = await punishmentManager.unmute(client, interaction.guild, interaction.user, targetMember, reason);

      const embed = moderationEmbed({
        action: 'Unmute',
        moderator: interaction.user.tag,
        target: target.tag,
        reason,
        caseId: punishment.caseId,
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Unmute] ${interaction.user.tag} unmuted ${target.tag} in ${interaction.guild.id} (Case #${punishment.caseId})`);
    } catch (err) {
      logger.error(`[Unmute] Error unmuting ${target.tag}: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to unmute the user. Please check my permissions.')], ephemeral: true });
    }
  },
};
