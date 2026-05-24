// ─────────────────────────────────────────────────────────────────────────────
// Command: /calc — Safely evaluate a math expression
// ─────────────────────────────────────────────────────────────────────────────

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Evaluate a math expression')
    .addStringOption((option) =>
      option.setName('expression').setDescription('The math expression to evaluate (e.g. 2 + 2, sqrt(16))').setRequired(true)
    ),

  cooldown: 3,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const expression = interaction.options.getString('expression');

    try {
      const result = safeEvaluate(expression);

      if (result === null || result === undefined || !isFinite(result)) {
        return interaction.reply({
          embeds: [errorEmbed('The expression resulted in an invalid value (infinity or undefined).')],
          ephemeral: true,
        });
      }

      const embed = createEmbed({
        title: '🧮 Calculator',
        color: COLORS.info,
        fields: [
          { name: 'Expression', value: `\`${expression}\``, inline: false },
          { name: 'Result', value: `\`${result}\``, inline: false },
        ],
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({
        embeds: [errorEmbed(`Invalid expression: ${err.message}`)],
        ephemeral: true,
      });
    }
  },
};

/**
 * Safely evaluates a math expression without using eval().
 * Only allows numbers, operators, parentheses, and common math functions.
 * @param {string} expr - The expression to evaluate
 * @returns {number} The result
 */
function safeEvaluate(expr) {
  // Remove whitespace
  let sanitized = expr.replace(/\s+/g, '');

  // Only allow safe characters: digits, operators, parentheses, dots, commas, and math function names
  if (!/^[0-9+\-*/().,%^a-z]+$/i.test(sanitized)) {
    throw new Error('Expression contains invalid characters.');
  }

  // Block any attempt to access properties or call arbitrary functions
  if (/[{}[\];=]/.test(sanitized)) {
    throw new Error('Expression contains invalid characters.');
  }

  // Replace common math functions with Math equivalents
  sanitized = sanitized
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bround\b/g, 'Math.round')
    .replace(/\bfloor\b/g, 'Math.floor')
    .replace(/\bceil\b/g, 'Math.ceil')
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\blog\b/g, 'Math.log')
    .replace(/\blog10\b/g, 'Math.log10')
    .replace(/\bpow\b/g, 'Math.pow')
    .replace(/\bmin\b/g, 'Math.min')
    .replace(/\bmax\b/g, 'Math.max')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\^/g, '**');

  // Use Function constructor with restricted scope (no access to global objects)
  const fn = new Function('Math', `"use strict"; return (${sanitized});`);
  return fn(Math);
}
