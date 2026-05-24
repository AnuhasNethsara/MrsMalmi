// ─────────────────────────────────────────────────────────────────────────────
// Event: voiceStateUpdate — Voice XP tracking handler
// ─────────────────────────────────────────────────────────────────────────────

const { startTracking, stopTracking } = require('../../services/leveling/voiceTracker');
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
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const joinedChannel = !oldState.channelId && newState.channelId;
      const leftChannel = oldState.channelId && !newState.channelId;
      const switchedChannel = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

      // Member joined a voice channel
      if (joinedChannel) {
        startTracking(member, client);
      }

      // Member left a voice channel
      if (leftChannel) {
        await stopTracking(member, client);
      }

      // Member switched channels — stop old, start new
      if (switchedChannel) {
        await stopTracking(member, client);
        startTracking(member, client);
      }
    } catch (err) {
      logger.error(`[Leveling:voiceStateUpdate] Error: ${err.message}`);
    }
  },
};
