// ─────────────────────────────────────────────────────────────────────────────
// Command: /verify — Manually verify a member (moderator only)
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const verification = require('../../services/security/verification');
const Guild = require('../../database/models/Guild');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Manually verify a member')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to verify')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  permissions: ['ManageRoles'],
  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(targetUser.id)
      || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: true });
    }

    if (member.user.bot) {
      return interaction.reply({ embeds: [errorEmbed('You cannot verify a bot.')], ephemeral: true });
    }

    // Fetch guild settings
    const guildDoc = await Guild.findOne({ guildId: interaction.guild.id }).lean();
    const settings = guildDoc?.security?.verification;

    if (!settings || !settings.enabled) {
      return interaction.reply({ embeds: [errorEmbed('Verification is not enabled on this server.')], ephemeral: true });
    }

    // Check if the member is already verified (has verified role)
    if (settings.verifiedRoleId && member.roles.cache.has(settings.verifiedRoleId)) {
      return interaction.reply({ embeds: [errorEmbed(`${member} is already verified.`)], ephemeral: true });
    }

    try {
      await verification.verifyMember(client, member, settings);

      await interaction.reply({
        embeds: [successEmbed(`${member} has been manually verified by ${interaction.user}.`)],
      });

      logger.info(`[Verify] ${interaction.user.tag} manually verified ${member.user.tag} in guild ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Verify] Error verifying ${member.user.tag}: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred while verifying the member.')], ephemeral: true });
    }
  },
};
