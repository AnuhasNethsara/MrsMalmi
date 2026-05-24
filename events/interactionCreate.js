// ─────────────────────────────────────────────────────────────────────────────
// Event: interactionCreate — Handles slash command execution with cooldowns
// ─────────────────────────────────────────────────────────────────────────────

const { Collection, EmbedBuilder } = require('discord.js');
const { COLORS, COOLDOWNS } = require('../config/constants');

module.exports = {
  name: 'interactionCreate',
  once: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // Only handle chat input (slash) commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`[Interaction] No command found for: ${interaction.commandName}`);
      return;
    }

    // ─── Cooldown handling ───────────────────────────────────────────────
    if (!client.cooldowns) {
      client.cooldowns = new Collection();
    }

    if (!client.cooldowns.has(command.data.name)) {
      client.cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = client.cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown ?? COOLDOWNS.defaultCommand) * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const expiredTimestamp = Math.round(expirationTime / 1000);

        const cooldownEmbed = new EmbedBuilder()
          .setColor(COLORS.warning)
          .setDescription(
            `⏳ Please wait — you can use \`/${command.data.name}\` again <t:${expiredTimestamp}:R>.`
          );

        return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    // ─── Execute command ─────────────────────────────────────────────────
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`[Interaction] Error executing /${command.data.name}:`, error);

      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle('❌ Command Error')
        .setDescription('An unexpected error occurred while running this command. Please try again later.')
        .setFooter({ text: 'If this persists, contact a server administrator.' })
        .setTimestamp();

      // Reply or follow up depending on whether we already responded
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};
