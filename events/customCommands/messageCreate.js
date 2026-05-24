// ─────────────────────────────────────────────────────────────────────────────
// Event: messageCreate — Handles custom command responses
// ─────────────────────────────────────────────────────────────────────────────

const CustomCommand = require('../../database/models/CustomCommand');
const Guild = require('../../database/models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,

  /**
   * @param {import('discord.js').Message} message
   * @param {import('discord.js').Client} client
   */
  async execute(message, client) {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
      // Get guild prefix
      const guildDoc = await Guild.findOne({ guildId: message.guild.id }).lean();
      const prefix = guildDoc?.prefix || '!';

      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();

      if (!commandName) return;

      // Look up custom command
      const customCmd = await CustomCommand.findOne({
        guildId: message.guild.id,
        name: commandName,
      }).lean();

      if (!customCmd) return;

      // Send the response
      await message.channel.send(customCmd.response);
      logger.info(`[CustomCmd] ${message.author.tag} used custom command "${commandName}" in ${message.guild.id}`);
    } catch (err) {
      logger.error(`[CustomCmd] Error: ${err.message}`);
    }
  },
};
