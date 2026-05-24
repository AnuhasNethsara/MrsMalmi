// ─────────────────────────────────────────────────────────────────────────────
// Command: /setstarboard — Configure the starboard channel and threshold
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../database/models/Guild');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstarboard')
    .setDescription('Configure the starboard channel and threshold')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Starboard channel').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('threshold').setDescription('Minimum stars required (1-20)').setRequired(true).setMinValue(1).setMaxValue(20)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  permissions: ['ManageGuild'],
  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const threshold = interaction.options.getInteger('threshold');

    try {
      await Guild.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          $set: {
            'starboard.channelId': channel.id,
            'starboard.threshold': threshold,
          },
        },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Starboard configured! Channel: ${channel} | Threshold: ${threshold} ⭐`)],
      });

      logger.info(`[Starboard] ${interaction.user.tag} set starboard to #${channel.name} (threshold: ${threshold}) in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Starboard] Error setting starboard: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to configure starboard.')], ephemeral: true });
    }
  },
};
