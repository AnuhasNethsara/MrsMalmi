// ─────────────────────────────────────────────────────────────────────────────
// Event: voiceStateUpdate — Auto voice channel creation and deletion
// ─────────────────────────────────────────────────────────────────────────────

const autoVoiceManager = require('../../services/autoVoice/autoVoiceManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,

  /**
   * @param {import('discord.js').VoiceState} oldState
   * @param {import('discord.js').VoiceState} newState
   * @param {import('discord.js').Client} client
   */
  async execute(oldState, newState, client) {
    try {
      // User joined a channel
      if (newState.channel && (!oldState.channel || oldState.channel.id !== newState.channel.id)) {
        const isCreator = await autoVoiceManager.isCreatorChannel(newState.guild.id, newState.channel.id);
        if (isCreator) {
          await autoVoiceManager.createTempChannel(newState);
        }
      }

      // User left a channel — check if temp channel should be deleted
      if (oldState.channel && (!newState.channel || oldState.channel.id !== newState.channel.id)) {
        await autoVoiceManager.checkAndDelete(oldState);
      }
    } catch (err) {
      logger.error(`[AutoVoice] Error in voiceStateUpdate: ${err.message}`);
    }
  },
};
