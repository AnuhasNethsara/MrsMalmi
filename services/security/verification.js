// ─────────────────────────────────────────────────────────────────────────────
// Verification Service — Manages member verification flow (CAPTCHA, button, timer)
// ─────────────────────────────────────────────────────────────────────────────

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embed');
const { COLORS, VERIFICATION } = require('../../config/constants');
const { generateCaptcha } = require('../../utils/captcha');
const logger = require('../../utils/logger');

/**
 * Starts the verification process for a new member.
 * Assigns the unverified role and sends the appropriate verification prompt.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 * @param {object} guildSettings - The guild's verification settings
 */
async function startVerification(client, member, guildSettings) {
  const redis = client.redis;
  const { guildId } = member.guild.id ? { guildId: member.guild.id } : {};
  const gId = member.guild.id;
  const userId = member.id;

  try {
    // Assign unverified role
    if (guildSettings.unverifiedRoleId) {
      const unverifiedRole = member.guild.roles.cache.get(guildSettings.unverifiedRoleId);
      if (unverifiedRole) {
        await member.roles.add(unverifiedRole, '[Verification] Pending verification');
      }
    }

    // Store pending verification in Redis with TTL
    const timeout = guildSettings.timeout || VERIFICATION.timeout;
    const ttlSeconds = Math.ceil(timeout / 1000);
    await redis.set(`verify:pending:${gId}:${userId}`, JSON.stringify({
      method: guildSettings.method,
      startedAt: Date.now(),
    }), 'EX', ttlSeconds);

    // Get the verification channel
    const channelId = guildSettings.channelId;
    const channel = channelId
      ? member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null)
      : null;

    // Send verification message based on method
    switch (guildSettings.method) {
      case 'button':
        await sendButtonVerification(client, member, channel);
        break;
      case 'captcha':
        await sendCaptchaVerification(client, member, channel, gId);
        break;
      case 'timer':
        await sendTimerVerification(client, member, channel);
        break;
      default:
        await sendButtonVerification(client, member, channel);
    }

    logger.info(`[Verification] Started ${guildSettings.method} verification for ${member.user.tag} in guild ${gId}`);
  } catch (err) {
    logger.error(`[Verification] startVerification error for ${member.user.tag}: ${err.message}`);
  }
}

/**
 * Sends a button-based verification message.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').TextChannel|null} channel
 */
async function sendButtonVerification(client, member, channel) {
  const embed = createEmbed({
    title: '🔒 Verification Required',
    description: `Welcome ${member}! Please click the button below to verify yourself and gain access to the server.`,
    color: COLORS.info,
    fields: [
      { name: 'Instructions', value: 'Click the **Verify** button below to confirm you are human.', inline: false },
    ],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`verify_button_${member.id}`)
      .setLabel('✅ Verify')
      .setStyle(ButtonStyle.Success)
  );

  if (channel) {
    await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
  } else {
    // Fallback: DM the member
    await member.send({ embeds: [embed], components: [row] }).catch(() => {
      logger.warn(`[Verification] Could not DM ${member.user.tag} for button verification`);
    });
  }
}

/**
 * Sends a CAPTCHA-based verification message.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').TextChannel|null} channel
 * @param {string} guildId
 */
async function sendCaptchaVerification(client, member, channel, guildId) {
  const redis = client.redis;
  const { code, buffer } = generateCaptcha();

  // Store CAPTCHA answer in Redis with a short TTL (5 minutes)
  await redis.set(`verify:captcha:${guildId}:${member.id}`, code, 'EX', 300);

  const attachment = new AttachmentBuilder(buffer, { name: 'captcha.png' });

  const embed = createEmbed({
    title: '🔒 CAPTCHA Verification',
    description: `Welcome ${member}! Please solve the CAPTCHA below to verify yourself.`,
    color: COLORS.info,
    fields: [
      { name: 'Instructions', value: 'Click the button below and enter the code shown in the image.', inline: false },
    ],
    image: 'attachment://captcha.png',
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`verify_captcha_submit_${member.id}`)
      .setLabel('📝 Enter Code')
      .setStyle(ButtonStyle.Primary)
  );

  if (channel) {
    await channel.send({ content: `${member}`, embeds: [embed], files: [attachment], components: [row] });
  } else {
    await member.send({ embeds: [embed], files: [attachment], components: [row] }).catch(() => {
      logger.warn(`[Verification] Could not DM ${member.user.tag} for CAPTCHA verification`);
    });
  }
}

/**
 * Sends a timer-based verification message.
 * The member is automatically verified after a short wait (30 seconds).
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').TextChannel|null} channel
 */
async function sendTimerVerification(client, member, channel) {
  const timerDuration = 30; // seconds

  const embed = createEmbed({
    title: '🔒 Verification — Please Wait',
    description: `Welcome ${member}! You will be automatically verified in **${timerDuration} seconds**.\n\nThis helps us filter out automated bots.`,
    color: COLORS.info,
  });

  if (channel) {
    await channel.send({ content: `${member}`, embeds: [embed] });
  } else {
    await member.send({ embeds: [embed] }).catch(() => {
      logger.warn(`[Verification] Could not DM ${member.user.tag} for timer verification`);
    });
  }

  // Auto-verify after timer
  setTimeout(async () => {
    try {
      // Check if still pending (not already kicked or left)
      const pending = await client.redis.get(`verify:pending:${member.guild.id}:${member.id}`);
      if (pending) {
        const guildDoc = await require('../../database/models/Guild').findOne({ guildId: member.guild.id }).lean();
        const settings = guildDoc?.security?.verification;
        if (settings) {
          await verifyMember(client, member, settings);
        }
      }
    } catch (err) {
      logger.error(`[Verification] Timer auto-verify error for ${member.user.tag}: ${err.message}`);
    }
  }, timerDuration * 1000);
}

/**
 * Completes verification for a member.
 * Removes unverified role, assigns verified role, and cleans up Redis keys.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 * @param {object} guildSettings - The guild's verification settings
 */
async function verifyMember(client, member, guildSettings) {
  const redis = client.redis;
  const gId = member.guild.id;
  const userId = member.id;

  try {
    // Remove unverified role
    if (guildSettings.unverifiedRoleId) {
      const unverifiedRole = member.guild.roles.cache.get(guildSettings.unverifiedRoleId);
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
        await member.roles.remove(unverifiedRole, '[Verification] Member verified');
      }
    }

    // Assign verified role
    if (guildSettings.verifiedRoleId) {
      const verifiedRole = member.guild.roles.cache.get(guildSettings.verifiedRoleId);
      if (verifiedRole) {
        await member.roles.add(verifiedRole, '[Verification] Member verified');
      }
    }

    // Clean up Redis keys
    await redis.del(`verify:pending:${gId}:${userId}`);
    await redis.del(`verify:captcha:${gId}:${userId}`);
    await redis.del(`verify:attempts:${gId}:${userId}`);

    logger.info(`[Verification] ${member.user.tag} verified in guild ${gId}`);
  } catch (err) {
    logger.error(`[Verification] verifyMember error for ${member.user.tag}: ${err.message}`);
  }
}

/**
 * Checks if a member's account meets the minimum age requirement.
 * @param {import('discord.js').GuildMember} member
 * @param {number} minAge - Minimum account age in milliseconds
 * @returns {boolean} True if account is old enough
 */
function checkAccountAge(member, minAge) {
  const accountAge = Date.now() - member.user.createdTimestamp;
  return accountAge >= minAge;
}

/**
 * Handles verification timeout — kicks the member if they haven't verified.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member
 * @param {object} guildSettings - The guild's verification settings
 */
async function handleTimeout(client, member, guildSettings) {
  const redis = client.redis;
  const gId = member.guild.id;

  try {
    // Check if still pending
    const pending = await redis.get(`verify:pending:${gId}:${member.id}`);
    if (!pending) return; // Already verified or left

    // DM the member before kicking
    const embed = createEmbed({
      title: '⏰ Verification Timeout',
      description: `You were kicked from **${member.guild.name}** because you did not complete verification in time.\n\nYou may rejoin and try again.`,
      color: COLORS.warning,
    });

    await member.send({ embeds: [embed] }).catch(() => {});

    // Kick the member
    if (member.kickable) {
      await member.kick('[Verification] Timed out — did not verify');
      logger.info(`[Verification] Kicked ${member.user.tag} from guild ${gId} (timeout)`);
    }

    // Clean up Redis
    await redis.del(`verify:pending:${gId}:${member.id}`);
    await redis.del(`verify:captcha:${gId}:${member.id}`);
    await redis.del(`verify:attempts:${gId}:${member.id}`);
  } catch (err) {
    logger.error(`[Verification] handleTimeout error for ${member.user.tag}: ${err.message}`);
  }
}

/**
 * Generates a CAPTCHA challenge and stores the answer in Redis.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<{ code: string, imageBuffer: Buffer }>}
 */
async function generateCaptchaChallenge(client, guildId, userId) {
  const redis = client.redis;
  const { code, buffer } = generateCaptcha();

  // Store answer in Redis with 5-minute TTL
  await redis.set(`verify:captcha:${guildId}:${userId}`, code, 'EX', 300);

  return { code, imageBuffer: buffer };
}

/**
 * Validates a CAPTCHA input against the stored answer.
 * Tracks failed attempts and blocks after max attempts.
 *
 * @param {import('discord.js').Client} client
 * @param {string} userId
 * @param {string} guildId
 * @param {string} input - The user's CAPTCHA input
 * @returns {Promise<{ valid: boolean, blocked: boolean, attemptsLeft: number }>}
 */
async function validateCaptcha(client, userId, guildId, input) {
  const redis = client.redis;
  const maxAttempts = VERIFICATION.maxAttempts;

  try {
    // Check if user is blocked
    const attempts = parseInt(await redis.get(`verify:attempts:${guildId}:${userId}`) || '0', 10);
    if (attempts >= maxAttempts) {
      return { valid: false, blocked: true, attemptsLeft: 0 };
    }

    // Get stored answer
    const storedCode = await redis.get(`verify:captcha:${guildId}:${userId}`);
    if (!storedCode) {
      return { valid: false, blocked: false, attemptsLeft: maxAttempts - attempts };
    }

    // Compare (case-insensitive)
    const valid = input.toUpperCase().trim() === storedCode.toUpperCase();

    if (!valid) {
      // Increment failed attempts with TTL (10 minutes)
      await redis.incr(`verify:attempts:${guildId}:${userId}`);
      await redis.expire(`verify:attempts:${guildId}:${userId}`, 600);

      const newAttempts = attempts + 1;
      return { valid: false, blocked: newAttempts >= maxAttempts, attemptsLeft: maxAttempts - newAttempts };
    }

    // Valid — clean up
    await redis.del(`verify:captcha:${guildId}:${userId}`);
    await redis.del(`verify:attempts:${guildId}:${userId}`);

    return { valid: true, blocked: false, attemptsLeft: maxAttempts };
  } catch (err) {
    logger.error(`[Verification] validateCaptcha error: ${err.message}`);
    return { valid: false, blocked: false, attemptsLeft: 0 };
  }
}

module.exports = {
  startVerification,
  verifyMember,
  checkAccountAge,
  handleTimeout,
  generateCaptchaChallenge,
  validateCaptcha,
};
