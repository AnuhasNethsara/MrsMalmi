// ─────────────────────────────────────────────────────────────────────────────
// Command: /ping — Shows bot latency (WebSocket ping + roundtrip)
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows bot latency (WebSocket ping and roundtrip)'),

  cooldown: 5,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsping = client.ws.ping;

    const embed = createEmbed({
      title: '🏓 Pong!',
      color: COLORS.info,
      fields: [
        { name: 'Roundtrip Latency', value: `${roundtrip}ms`, inline: true },
        { name: 'WebSocket Ping', value: `${wsping}ms`, inline: true },
      ],
    });

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
