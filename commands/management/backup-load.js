// ─────────────────────────────────────────────────────────────────────────────
// Command: /backup-load — Load a server backup
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const backupManager = require('../../services/backup/backupManager');
const { warningEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-load')
    .setDescription('Load a server backup (destructive operation)')
    .addStringOption((option) =>
      option.setName('id').setDescription('Backup ID').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  permissions: ['Administrator'],
  cooldown: 60,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const backupId = interaction.options.getString('id');

    // Confirmation prompt
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('backup_confirm')
        .setLabel('Confirm Load')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('backup_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [warningEmbed('⚠️ **This will modify your server!** Channels and roles from the backup will be created. Are you sure?')],
      components: [row],
      ephemeral: true,
    });

    // Wait for confirmation
    try {
      const filter = (i) => i.user.id === interaction.user.id;
      const confirmation = await interaction.channel.awaitMessageComponent({ filter, time: 30000 });

      if (confirmation.customId === 'backup_cancel') {
        await confirmation.update({ embeds: [errorEmbed('Backup load cancelled.')], components: [] });
        return;
      }

      await confirmation.update({ embeds: [warningEmbed('Loading backup... This may take a moment.')], components: [] });

      const result = await backupManager.loadBackup(interaction.guild, backupId);

      if (!result.success) {
        await interaction.editReply({ embeds: [errorEmbed(result.message)], components: [] });
        return;
      }

      await interaction.editReply({ embeds: [successEmbed('Backup loaded successfully!')], components: [] });
      logger.info(`[Backup] ${interaction.user.tag} loaded backup ${backupId} in ${interaction.guild.id}`);
    } catch (err) {
      if (err.code === 'InteractionCollectorError') {
        await interaction.editReply({ embeds: [errorEmbed('Confirmation timed out.')], components: [] });
      } else {
        logger.error(`[Backup] Error loading backup: ${err.message}`);
        await interaction.editReply({ embeds: [errorEmbed('Failed to load backup.')], components: [] });
      }
    }
  },
};
