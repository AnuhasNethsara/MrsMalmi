// ─────────────────────────────────────────────────────────────────────────────
// Command: /setbio — Set your profile bio
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setbio')
    .setDescription('Set your profile bio')
    .addStringOption((option) =>
      option.setName('text').setDescription('Your bio text (max 200 characters)').setRequired(true).setMaxLength(200)
    ),

  cooldown: 10,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const text = interaction.options.getString('text');

    try {
      await User.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: interaction.user.id },
        { $set: { bio: text } },
        { upsert: true },
      );

      await interaction.reply({ embeds: [successEmbed('Your bio has been updated!')] });
      logger.info(`[Social] ${interaction.user.tag} updated bio in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Social] Error setting bio: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to update bio.')], ephemeral: true });
    }
  },
};
