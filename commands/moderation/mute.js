// ─────────────────────────────────────────────────────────────────────────────
// Command: /mute — Timeout a user in the server
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const punishmentManager = require('../../services/moderation/punishmentManager');
const { moderationEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a user in the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to mute').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Mute duration (e.g. 1h, 30m, 7d)').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the mute').setRequired(true)
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
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason');

    // Prevent self-mute
    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot mute yourself.')], ephemeral: true });
    }

    // Prevent muting the bot
    if (target.id === client.user.id) {
      return interaction.reply({ embeds: [errorEmbed('I cannot mute myself.')], ephemeral: true });
    }

    // Fetch target member
    const targetMember = interaction.guild.members.cache.get(target.id)
      || await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: true });
    }

    // Check hierarchy
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('You cannot mute a member with equal or higher role.')], ephemeral: true });
    }

    if (!targetMember.moderatable) {
      return interaction.reply({ embeds: [errorEmbed('I cannot mute this user. They may have a higher role than me.')], ephemeral: true });
    }

    // Validate duration (Discord timeout max is 28 days)
    const ms = require('ms');
    const durationMs = ms(duration);
    if (!durationMs) {
      return interaction.reply({ embeds: [errorEmbed('Invalid duration format. Use formats like `1h`, `30m`, `7d`.')], ephemeral: true });
    }
    if (durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ embeds: [errorEmbed('Timeout duration cannot exceed 28 days.')], ephemeral: true });
    }

    try {
      const punishment = await punishmentManager.mute(client, interaction.guild, interaction.user, targetMember, reason, duration);

      const embed = moderationEmbed({
        action: 'Mute',
        moderator: interaction.user.tag,
        target: target.tag,
        reason,
        caseId: punishment.caseId,
        duration,
      });

      await interaction.reply({ embeds: [embed] });
      logger.info(`[Mute] ${interaction.user.tag} muted ${target.tag} for ${duration} in ${interaction.guild.id} (Case #${punishment.caseId})`);
    } catch (err) {
      logger.error(`[Mute] Error muting ${target.tag}: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to mute the user. Please check my permissions.')], ephemeral: true });
    }
  },
};
