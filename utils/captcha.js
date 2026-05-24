// ─────────────────────────────────────────────────────────────────────────────
// CAPTCHA Generator — Generates CAPTCHA images using @napi-rs/canvas
// ─────────────────────────────────────────────────────────────────────────────

const { createCanvas } = require('@napi-rs/canvas');

// Characters that are easy to distinguish (no 0/O, 1/l/I confusion)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a random alphanumeric code of the specified length.
 * @param {number} [length=6] - Length of the code
 * @returns {string} Random code
 */
function generateCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/**
 * Generates a CAPTCHA image with noise and distortion.
 * @returns {{ code: string, buffer: Buffer }} The CAPTCHA code and PNG image buffer
 */
function generateCaptcha() {
  const width = 280;
  const height = 100;
  const code = generateCode(6);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#2b2d31'; // Discord dark theme background
  ctx.fillRect(0, 0, width, height);

  // ── Noise dots ──────────────────────────────────────────────────────────
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = `rgba(${rand(100, 200)}, ${rand(100, 200)}, ${rand(100, 200)}, ${Math.random() * 0.5 + 0.2})`;
    ctx.beginPath();
    ctx.arc(rand(0, width), rand(0, height), rand(1, 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Noise lines ─────────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(${rand(80, 180)}, ${rand(80, 180)}, ${rand(80, 180)}, ${Math.random() * 0.6 + 0.2})`;
    ctx.lineWidth = rand(1, 3);
    ctx.beginPath();
    ctx.moveTo(rand(0, width), rand(0, height));
    ctx.bezierCurveTo(
      rand(0, width), rand(0, height),
      rand(0, width), rand(0, height),
      rand(0, width), rand(0, height)
    );
    ctx.stroke();
  }

  // ── Draw characters with rotation ──────────────────────────────────────
  const fontSize = 38;
  const charSpacing = (width - 40) / code.length;

  for (let i = 0; i < code.length; i++) {
    const x = 30 + i * charSpacing;
    const y = height / 2 + rand(-8, 8);
    const rotation = (Math.random() - 0.5) * 0.5; // -0.25 to 0.25 radians

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Random color for each character
    ctx.fillStyle = `rgb(${rand(150, 255)}, ${rand(150, 255)}, ${rand(150, 255)})`;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code[i], 0, 0);

    ctx.restore();
  }

  // ── Additional interference lines over text ─────────────────────────────
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${rand(100, 220)}, ${rand(100, 220)}, ${rand(100, 220)}, 0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rand(0, width), rand(0, height));
    ctx.lineTo(rand(0, width), rand(0, height));
    ctx.stroke();
  }

  const buffer = canvas.toBuffer('image/png');

  return { code, buffer };
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { generateCaptcha, generateCode };
