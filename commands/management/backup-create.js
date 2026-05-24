// ─────────────────────────────────────────────────────────────────────────────
// Command: /backup-create — Create a full server backup
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const backupManager = require('../../services/backup/backupManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-create')
    .setDescription('Create a full server backup')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  permissions: ['Administrator'],
  cooldown: 60,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await backupManager.createBackup(interaction.guild, interaction.user.id);

      await interaction.editReply({
        embeds: [successEmbed(`Backup created!\n**ID:** \`${result.id}\`\n**Size:** ${(result.size / 1024).toFixed(1)}KB`)],
      });

      logger.info(`[Backup] ${interaction.user.tag} created backup ${result.id} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Backup] Error creating backup: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Failed to create backup.')] });
    }
  },
};
