// ─────────────────────────────────────────────────────────────────────────────
// Command: /backup-list — List available server backups
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const backupManager = require('../../services/backup/backupManager');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-list')
    .setDescription('List available server backups')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  permissions: ['Administrator'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const backups = backupManager.listBackups(interaction.guild.id);

      if (!backups.length) {
        return interaction.reply({ embeds: [errorEmbed('No backups found for this server.')], ephemeral: true });
      }

      const description = backups.slice(0, 10).map((backup, index) => {
        const date = new Date(backup.createdAt);
        const size = (backup.size / 1024).toFixed(1);
        return `**${index + 1}.** \`${backup.id}\`\n> Created: <t:${Math.floor(date.getTime() / 1000)}:R> | Size: ${size}KB`;
      }).join('\n\n');

      const embed = createEmbed({
        title: '💾 Server Backups',
        description,
        color: COLORS.primary,
        fields: [
          { name: 'Total Backups', value: `${backups.length}`, inline: true },
        ],
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Failed to list backups.')], ephemeral: true });
    }
  },
};
