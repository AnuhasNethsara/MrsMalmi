// ─────────────────────────────────────────────────────────────────────────────
// Service: Music Manager — Queue management, playback control, volume
// ─────────────────────────────────────────────────────────────────────────────

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const play = require('play-dl');
const logger = require('../../utils/logger');

/**
 * @typedef {Object} Track
 * @property {string} title - Track title
 * @property {string} url - Track URL
 * @property {number} duration - Duration in seconds
 * @property {string} thumbnail - Thumbnail URL
 * @property {string} requestedBy - User tag who requested
 */

/**
 * @typedef {Object} GuildQueue
 * @property {Track[]} tracks - Array of queued tracks
 * @property {import('@discordjs/voice').AudioPlayer} player - Audio player
 * @property {import('@discordjs/voice').VoiceConnection} connection - Voice connection
 * @property {number} volume - Volume level (1-100)
 * @property {boolean} playing - Whether currently playing
 * @property {import('@discordjs/voice').AudioResource|null} resource - Current audio resource
 * @property {number} startedAt - Timestamp when current track started
 */

/** @type {Map<string, GuildQueue>} */
const queues = new Map();

/**
 * Gets or creates a queue for a guild.
 * @param {string} guildId
 * @returns {GuildQueue|null}
 */
function getQueue(guildId) {
  return queues.get(guildId) || null;
}

/**
 * Returns the currently playing track info.
 * @param {string} guildId
 * @returns {{ track: Track, startedAt: number }|null}
 */
function nowPlaying(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.tracks.length || !queue.playing) return null;
  return { track: queue.tracks[0], startedAt: queue.startedAt };
}

/**
 * Searches YouTube and plays audio in the user's voice channel.
 * @param {import('discord.js').Guild} guild - Discord guild
 * @param {import('discord.js').VoiceBasedChannel} channel - Voice channel to join
 * @param {string} query - Search query or URL
 * @param {string} requestedBy - User tag
 * @returns {Promise<Track>}
 */
async function playTrack(guild, channel, query, requestedBy) {
  let trackInfo;

  // Check if it's a URL or search query
  if (play.yt_validate(query) === 'video') {
    const info = await play.video_info(query);
    trackInfo = {
      title: info.video_details.title,
      url: info.video_details.url,
      duration: info.video_details.durationInSec,
      thumbnail: info.video_details.thumbnails[0]?.url || null,
      requestedBy,
    };
  } else {
    const searched = await play.search(query, { limit: 1 });
    if (!searched.length) throw new Error('No results found for your query.');
    trackInfo = {
      title: searched[0].title,
      url: searched[0].url,
      duration: searched[0].durationInSec,
      thumbnail: searched[0].thumbnails[0]?.url || null,
      requestedBy,
    };
  }

  let queue = queues.get(guild.id);

  if (!queue) {
    // Create new queue and connection
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });

    connection.subscribe(player);

    queue = {
      tracks: [],
      player,
      connection,
      volume: 80,
      playing: false,
      resource: null,
      startedAt: 0,
    };

    queues.set(guild.id, queue);

    // Handle player idle (track ended)
    player.on(AudioPlayerStatus.Idle, () => {
      queue.tracks.shift();
      if (queue.tracks.length > 0) {
        playNext(guild.id);
      } else {
        queue.playing = false;
        setTimeout(() => {
          const q = queues.get(guild.id);
          if (q && !q.playing && q.tracks.length === 0) {
            q.connection.destroy();
            queues.delete(guild.id);
            logger.info(`[Music] Left voice in ${guild.id} (queue empty)`);
          }
        }, 120000); // Leave after 2 minutes of inactivity
      }
    });

    player.on('error', (err) => {
      logger.error(`[Music] Player error in ${guild.id}: ${err.message}`);
      queue.tracks.shift();
      if (queue.tracks.length > 0) {
        playNext(guild.id);
      }
    });

    // Handle disconnection
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch {
        connection.destroy();
        queues.delete(guild.id);
        logger.info(`[Music] Connection destroyed in ${guild.id} (disconnected)`);
      }
    });
  }

  queue.tracks.push(trackInfo);

  // If not currently playing, start playback
  if (!queue.playing) {
    await playNext(guild.id);
  }

  return trackInfo;
}

/**
 * Plays the next track in the queue.
 * @param {string} guildId
 */
async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.tracks.length) return;

  const track = queue.tracks[0];

  try {
    const stream = await play.stream(track.url);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });

    resource.volume.setVolumeLogarithmic(queue.volume / 100);
    queue.resource = resource;
    queue.player.play(resource);
    queue.playing = true;
    queue.startedAt = Date.now();

    logger.info(`[Music] Now playing: ${track.title} in guild ${guildId}`);
  } catch (err) {
    logger.error(`[Music] Error playing track in ${guildId}: ${err.message}`);
    queue.tracks.shift();
    if (queue.tracks.length > 0) {
      await playNext(guildId);
    } else {
      queue.playing = false;
    }
  }
}

/**
 * Skips the current track.
 * @param {string} guildId
 * @returns {Track|null} The skipped track
 */
function skip(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.tracks.length) return null;

  const skipped = queue.tracks[0];
  queue.player.stop();
  return skipped;
}

/**
 * Stops playback, clears queue, and leaves voice.
 * @param {string} guildId
 */
function stop(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  queue.tracks = [];
  queue.playing = false;
  queue.player.stop();
  queue.connection.destroy();
  queues.delete(guildId);
  logger.info(`[Music] Stopped and left voice in ${guildId}`);
}

/**
 * Pauses playback.
 * @param {string} guildId
 * @returns {boolean} Whether pause was successful
 */
function pause(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.playing) return false;
  queue.player.pause();
  queue.playing = false;
  return true;
}

/**
 * Resumes playback.
 * @param {string} guildId
 * @returns {boolean} Whether resume was successful
 */
function resume(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  queue.player.unpause();
  queue.playing = true;
  return true;
}

/**
 * Sets the volume for the guild's player.
 * @param {string} guildId
 * @param {number} vol - Volume level (1-100)
 * @returns {boolean} Whether volume was set
 */
function setVolume(guildId, vol) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  queue.volume = vol;
  if (queue.resource && queue.resource.volume) {
    queue.resource.volume.setVolumeLogarithmic(vol / 100);
  }
  return true;
}

module.exports = {
  play: playTrack,
  skip,
  stop,
  pause,
  resume,
  setVolume,
  getQueue,
  nowPlaying,
};
