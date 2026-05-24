// ─────────────────────────────────────────────────────────────────────────────
// Command: /giveaway start — Start a new giveaway
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const giveawayManager = require('../../services/giveaway/giveawayManager');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a new giveaway')
    .addStringOption((option) =>
      option.setName('prize').setDescription('What is the prize?').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Duration (e.g. 1h, 1d, 30m)').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1).setMaxValue(20)
    )
    .addRoleOption((option) =>
      option.setName('required-role').setDescription('Required role to enter').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const prize = interaction.options.getString('prize');
    const duration = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners');
    const requiredRole = interaction.options.getRole('required-role');

    // Parse duration
    const durationMs = ms(duration);
    if (!durationMs || durationMs < 60000 || durationMs > 30 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid duration. Use formats like `30m`, `1h`, `1d`. Min: 1 minute, Max: 30 days.')],
        ephemeral: true,
      });
    }

    const endsAt = new Date(Date.now() + durationMs);

    try {
      await interaction.deferReply({ ephemeral: true });

      await giveawayManager.createGiveaway({
        channel: interaction.channel,
        prize,
        hostId: interaction.user.id,
        winners,
        endsAt,
        requirements: requiredRole ? { role: requiredRole.id } : {},
      });

      await interaction.editReply({
        embeds: [successEmbed(`Giveaway for **${prize}** started! Ends <t:${Math.floor(endsAt.getTime() / 1000)}:R>.`)],
      });

      logger.info(`[Giveaway] ${interaction.user.tag} started giveaway "${prize}" in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Giveaway] Error creating giveaway: ${err.message}`);
      await interaction.editReply({ embeds: [errorEmbed('Failed to create giveaway.')] });
    }
  },
};
