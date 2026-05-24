// ─────────────────────────────────────────────────────────────────────────────
// Command: /embed — Create and send a custom embed
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create and send a custom embed')
    .addStringOption((option) =>
      option.setName('title').setDescription('Embed title').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('description').setDescription('Embed description').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('color').setDescription('Embed color (hex code, e.g. #ff0000)').setRequired(false)
    ),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorInput = interaction.options.getString('color');

    let color = COLORS.primary;

    if (colorInput) {
      // Parse hex color (with or without #)
      const hex = colorInput.replace('#', '');
      const parsed = parseInt(hex, 16);

      if (isNaN(parsed) || hex.length < 3 || hex.length > 6) {
        return interaction.reply({
          embeds: [errorEmbed('Invalid color. Please provide a valid hex code (e.g. `#ff0000` or `ff0000`).')],
          ephemeral: true,
        });
      }

      color = parsed;
    }

    const embed = createEmbed({
      title,
      description,
      color,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
