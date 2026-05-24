// ─────────────────────────────────────────────────────────────────────────────
// Command: /divorce — End your marriage
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divorce')
    .setDescription('End your marriage'),

  cooldown: 30,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    try {
      const user = await User.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });

      if (!user?.marriedTo) {
        return interaction.reply({ embeds: [errorEmbed('You are not married.')], ephemeral: true });
      }

      const partnerId = user.marriedTo;

      // Remove marriage from both users
      await User.updateOne(
        { guildId: interaction.guild.id, userId: interaction.user.id },
        { $unset: { marriedTo: '' } },
      );
      await User.updateOne(
        { guildId: interaction.guild.id, userId: partnerId },
        { $unset: { marriedTo: '' } },
      );

      await interaction.reply({ embeds: [successEmbed(`You have divorced <@${partnerId}>. 💔`)] });
      logger.info(`[Social] ${interaction.user.tag} divorced ${partnerId} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Social] Error in divorce: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true });
    }
  },
};
