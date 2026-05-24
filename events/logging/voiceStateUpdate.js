// ─────────────────────────────────────────────────────────────────────────────
// Event: voiceStateUpdate — Logs voice channel events to the configured log channel
// ─────────────────────────────────────────────────────────────────────────────

const { logEvent } = require('../../services/logging/logger');
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
      const guild = newState.guild || oldState.guild;
      if (!guild) return;

      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const guildId = guild.id;
      const userTag = `${member.user.tag} (${member.user.id})`;

      // Determine what changed
      if (!oldState.channelId && newState.channelId) {
        // Joined a voice channel
        await logEvent(client, guildId, 'voice', {
          action: 'Voice Join',
          target: userTag,
          fields: [
            { name: 'Channel', value: `<#${newState.channelId}>`, inline: true },
          ],
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        });
      } else if (oldState.channelId && !newState.channelId) {
        // Left a voice channel
        await logEvent(client, guildId, 'voice', {
          action: 'Voice Leave',
          target: userTag,
          fields: [
            { name: 'Channel', value: `<#${oldState.channelId}>`, inline: true },
          ],
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        });
      } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Moved between channels
        await logEvent(client, guildId, 'voice', {
          action: 'Voice Move',
          target: userTag,
          fields: [
            { name: 'From', value: `<#${oldState.channelId}>`, inline: true },
            { name: 'To', value: `<#${newState.channelId}>`, inline: true },
          ],
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        });
      } else {
        // State change (mute/deafen) in the same channel
        const changes = [];

        if (oldState.serverMute !== newState.serverMute) {
          changes.push(newState.serverMute ? 'Server Muted' : 'Server Unmuted');
        }
        if (oldState.serverDeaf !== newState.serverDeaf) {
          changes.push(newState.serverDeaf ? 'Server Deafened' : 'Server Undeafened');
        }
        if (oldState.selfMute !== newState.selfMute) {
          changes.push(newState.selfMute ? 'Self Muted' : 'Self Unmuted');
        }
        if (oldState.selfDeaf !== newState.selfDeaf) {
          changes.push(newState.selfDeaf ? 'Self Deafened' : 'Self Undeafened');
        }
        if (oldState.streaming !== newState.streaming) {
          changes.push(newState.streaming ? 'Started Streaming' : 'Stopped Streaming');
        }
        if (oldState.selfVideo !== newState.selfVideo) {
          changes.push(newState.selfVideo ? 'Camera On' : 'Camera Off');
        }

        if (changes.length === 0) return;

        await logEvent(client, guildId, 'voice', {
          action: 'Voice State Change',
          target: userTag,
          fields: [
            { name: 'Changes', value: changes.join(', '), inline: false },
            { name: 'Channel', value: `<#${newState.channelId}>`, inline: true },
          ],
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        });
      }
    } catch (err) {
      logger.error(`[Logging:voiceStateUpdate] Error: ${err.message}`);
    }
  },
};
