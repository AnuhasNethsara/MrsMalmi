// ─────────────────────────────────────────────────────────────────────────────
// Command: /application-review — Review a pending application
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../database/models/Application');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('application-review')
    .setDescription('Review a pending application')
    .addStringOption((option) =>
      option.setName('id').setDescription('Application ID').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('action').setDescription('Accept or deny').setRequired(true)
        .addChoices(
          { name: 'Accept', value: 'accepted' },
          { name: 'Deny', value: 'denied' },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const applicationId = interaction.options.getString('id');
    const action = interaction.options.getString('action');

    try {
      const application = await Application.findById(applicationId);

      if (!application || application.guildId !== interaction.guild.id) {
        return interaction.reply({ embeds: [errorEmbed('Application not found.')], ephemeral: true });
      }

      if (application.status !== 'pending') {
        return interaction.reply({ embeds: [errorEmbed('This application has already been reviewed.')], ephemeral: true });
      }

      application.status = action;
      application.reviewedBy = interaction.user.id;
      await application.save();

      // Notify the applicant
      try {
        const applicant = await client.users.fetch(application.applicantId);
        const statusText = action === 'accepted' ? '✅ Accepted' : '❌ Denied';
        await applicant.send(`Your **${application.type}** application in **${interaction.guild.name}** has been ${statusText}.`).catch(() => null);
      } catch {
        // Can't DM user, that's fine
      }

      await interaction.reply({
        embeds: [successEmbed(`Application ${action}! Applicant has been notified.`)],
        ephemeral: true,
      });

      logger.info(`[Application] ${interaction.user.tag} ${action} application ${applicationId} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Application] Error reviewing: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to review application.')], ephemeral: true });
    }
  },
};
