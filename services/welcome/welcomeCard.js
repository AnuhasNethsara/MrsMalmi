// ─────────────────────────────────────────────────────────────────────────────
// Welcome Card Generator — Creates a visual welcome card using @napi-rs/canvas
// ─────────────────────────────────────────────────────────────────────────────

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const logger = require('../../utils/logger');

/**
 * Generates a welcome card image buffer for a new member.
 * Creates a 700x250 card with member avatar, username, welcome text, and member count.
 *
 * @param {import('discord.js').GuildMember} member - The new guild member
 * @param {import('discord.js').Guild} guild - The guild
 * @returns {Promise<Buffer|null>} PNG image buffer or null on failure
 */
async function generateWelcomeCard(member, guild) {
  try {
    const width = 700;
    const height = 250;
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
    const avatarSize = 128;
    const avatarX = 50;
    const avatarY = (height - avatarSize) / 2;

    // Draw circular avatar clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Load and draw avatar
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    try {
      const avatar = await loadImage(avatarUrl);
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      // Fallback: draw a colored circle if avatar fails to load
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

    // Welcome text
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '20px sans-serif';
    ctx.fillText('Welcome to', textX, 80);

    // Server name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    const serverName = truncateText(ctx, guild.name, width - textX - 30);
    ctx.fillText(serverName, textX, 115);

    // Username
    ctx.fillStyle = '#5865f2';
    ctx.font = 'bold 22px sans-serif';
    const username = truncateText(ctx, member.user.username, width - textX - 30);
    ctx.fillText(username, textX, 160);

    // Member count
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Member #${guild.memberCount}`, textX, 195);

    return canvas.toBuffer('image/png');
  } catch (err) {
    logger.error(`[WelcomeCard] Error generating card for ${member.user?.tag}: ${err.message}`);
    return null;
  }
}

/**
 * Truncates text to fit within a maximum width, adding ellipsis if needed.
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

module.exports = { generateWelcomeCard };
