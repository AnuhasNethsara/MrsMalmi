// ─────────────────────────────────────────────────────────────────────────────
// Command: /rep — Give reputation to another user (24h cooldown)
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

/** @type {Map<string, number>} key -> last rep timestamp */
const repCooldowns = new Map();
const REP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Give reputation to another user (24h cooldown)')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to give rep to').setRequired(true)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const target = interaction.options.getUser('user');

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('You cannot give reputation to yourself.')], ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('You cannot give reputation to a bot.')], ephemeral: true });
    }

    // Check cooldown
    const cooldownKey = `${interaction.guild.id}-${interaction.user.id}`;
    const lastRep = repCooldowns.get(cooldownKey);
    if (lastRep && Date.now() - lastRep < REP_COOLDOWN) {
      const remaining = Math.ceil((REP_COOLDOWN - (Date.now() - lastRep)) / 3600000);
      return interaction.reply({
        embeds: [errorEmbed(`You can give rep again in **${remaining} hour(s)**.`)],
        ephemeral: true,
      });
    }

    try {
      await User.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: target.id },
        { $inc: { reputation: 1 } },
        { upsert: true },
      );

      repCooldowns.set(cooldownKey, Date.now());

      await interaction.reply({ embeds: [successEmbed(`You gave **+1 rep** to **${target.tag}**! ⭐`)] });
      logger.info(`[Social] ${interaction.user.tag} gave rep to ${target.tag} in ${interaction.guild.id}`);
    } catch (err) {
      logger.error(`[Social] Error giving rep: ${err.message}`);
      await interaction.reply({ embeds: [errorEmbed('Failed to give reputation.')], ephemeral: true });
    }
  },
};
