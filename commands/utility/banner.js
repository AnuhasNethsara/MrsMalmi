// ─────────────────────────────────────────────────────────────────────────────
// Command: /banner — Shows a user's banner
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription("Shows a user's banner")
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to get the banner of (defaults to you)').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;

    // Force fetch user to get banner data
    const fetchedUser = await client.users.fetch(user.id, { force: true });
    const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 4096 });

    if (!bannerURL) {
      return interaction.reply({
        embeds: [errorEmbed(`${user.tag} does not have a banner set.`)],
        ephemeral: true,
      });
    }

    const embed = createEmbed({
      title: `${user.tag}'s Banner`,
      image: bannerURL,
      color: COLORS.info,
      description: `[Download Banner](${bannerURL})`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
