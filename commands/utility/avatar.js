// ─────────────────────────────────────────────────────────────────────────────
// Command: /avatar — Shows a user's avatar in full size
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Shows a user's avatar in full size")
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to get the avatar of (defaults to you)').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const avatarURL = user.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = createEmbed({
      title: `${user.tag}'s Avatar`,
      image: avatarURL,
      color: COLORS.info,
      description: `[Download Avatar](${avatarURL})`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
