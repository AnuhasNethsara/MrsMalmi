// ─────────────────────────────────────────────────────────────────────────────
// Rank Card Generator — Creates a visual rank card using @napi-rs/canvas
// ─────────────────────────────────────────────────────────────────────────────

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { xpForLevel } = require('./levelManager');
const logger = require('../../utils/logger');

/**
 * Generates a rank card image buffer for a user.
 * Shows level, XP, progress bar, rank position, and avatar.
 *
 * @param {object} userData - The user document from database
 * @param {import('discord.js').GuildMember} member - The guild member
 * @param {number} [rank=0] - The user's rank position in the guild
 * @returns {Promise<Buffer|null>} PNG image buffer or null on failure
 */
async function generateRankCard(userData, member, rank = 0) {
  try {
    const width = 934;
    const height = 282;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // ── Background ──────────────────────────────────────────────────────────
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // ── Border ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = '#5865f2';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // ── Avatar ──────────────────────────────────────────────────────────────
    const avatarSize = 150;
    const avatarX = 50;
    const avatarY = (height - avatarSize) / 2;

    // Circular clip for avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      ctx.fillStyle = '#5865f2';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    // Avatar border ring
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#5865f2';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ── Text Content ────────────────────────────────────────────────────────
    const textX = avatarX + avatarSize + 40;
    const level = userData.level || 0;
    const currentLevelXP = xpForLevel(level);

    // Calculate XP progress within current level
    let xpIntoLevel = userData.xp;
    for (let i = 0; i < level; i++) {
      xpIntoLevel -= xpForLevel(i);
    }
    xpIntoLevel = Math.max(0, xpIntoLevel);

    // Username
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    const username = truncateText(ctx, member.user.username, 300);
    ctx.fillText(username, textX, 60);

    // Discriminator / Display name
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '18px sans-serif';
    ctx.fillText(member.user.tag, textX, 85);

    // Rank and Level badges
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '18px sans-serif';
    ctx.fillText('RANK', textX + 450, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`#${rank}`, textX + 450, 85);

    ctx.fillStyle = '#a0a0a0';
    ctx.font = '18px sans-serif';
    ctx.fillText('LEVEL', textX + 560, 50);
    ctx.fillStyle = '#5865f2';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`${level}`, textX + 560, 85);

    // ── Progress Bar ────────────────────────────────────────────────────────
    const barX = textX;
    const barY = 160;
    const barWidth = width - textX - 50;
    const barHeight = 30;
    const progress = Math.min(xpIntoLevel / currentLevelXP, 1);

    // Background bar
    ctx.fillStyle = '#2c2f33';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 15);
    ctx.fill();

    // Progress fill
    if (progress > 0) {
      const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * progress, barY);
      progressGradient.addColorStop(0, '#5865f2');
      progressGradient.addColorStop(1, '#7289da');
      ctx.fillStyle = progressGradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * progress, barHeight, 15);
      ctx.fill();
    }

    // XP text
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${xpIntoLevel.toLocaleString()} / ${currentLevelXP.toLocaleString()} XP`, barX, barY + 55);

    // Total XP
    ctx.fillStyle = '#666666';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Total: ${userData.xp.toLocaleString()} XP`, barX + barWidth - 150, barY + 55);

    return canvas.toBuffer('image/png');
  } catch (err) {
    logger.error(`[RankCard] Error generating card for ${member.user?.tag}: ${err.message}`);
    return null;
  }
}

/**
 * Truncates text to fit within a maximum width.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to truncate
 * @param {number} maxWidth - Maximum pixel width
 * @returns {string} Truncated text
 */
function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

module.exports = { generateRankCard };
