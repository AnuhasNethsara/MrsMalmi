// ─────────────────────────────────────────────────────────────────────────────
// Command: /raidmode — Manually toggle raid mode
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidmode')
    .setDescription('Manually toggle raid mode')
    .addStringOption((option) =>
      option.setName('action').setDescription('Turn raid mode on or off').setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' },
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  permissions: ['Administrator'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const action = interaction.options.getString('action');
    const enabled = action === 'on';

    try {
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $set: { 'security.antiRaid.enabled': enabled } },
        { upsert: true },
      );

      if (enabled) {
        // Set verification level to highest
        await interaction.guild.setVerificationLevel(4).catch(() => null);
        await interaction.reply({ embeds: [successEmbed('🚨 **Raid mode enabled!** Verification level set to highest. New members will be restricted.')] });
      } else {
        await interaction.guild.setVerificationLevel(1).catch(() => null);
        await interaction.reply({ embeds: [successEmbed('✅ **Raid mode disabled.** Verification level restored.')] });
      }

      logger.info(`[Raidmode] ${interaction.user.tag} set raid mode to ${action} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Raidmode] Error: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to toggle raid mode.')], ephemeral: true });
    }
  },
};
