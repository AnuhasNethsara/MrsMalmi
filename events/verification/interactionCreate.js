// ─────────────────────────────────────────────────────────────────────────────
// Event: interactionCreate — Handles verification button clicks and CAPTCHA modals
// ─────────────────────────────────────────────────────────────────────────────

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const verification = require('../../services/security/verification');
const Guild = require('../../database/models/Guild');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // Handle button interactions for verification
    if (interaction.isButton()) {
      await handleButton(interaction, client);
      return;
    }

    // Handle modal submissions for CAPTCHA
    if (interaction.isModalSubmit()) {
      await handleModal(interaction, client);
      return;
    }
  },
};

/**
 * Handles verification button interactions.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleButton(interaction, client) {
  const customId = interaction.customId;

  // Only handle verify_ prefixed buttons
  if (!customId.startsWith('verify_')) return;

  try {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Fetch guild settings
    const guildDoc = await Guild.findOne({ guildId }).lean();
    const settings = guildDoc?.security?.verification;

    if (!settings || !settings.enabled) {
      await interaction.reply({ embeds: [errorEmbed('Verification is not enabled on this server.')], ephemeral: true });
      return;
    }

    // Check if user has a pending verification
    const pending = await client.redis.get(`verify:pending:${guildId}:${userId}`);
    if (!pending) {
      await interaction.reply({ embeds: [warningEmbed('You do not have a pending verification, or you are already verified.')], ephemeral: true });
      return;
    }

    // ── Button verification ─────────────────────────────────────────────
    if (customId.startsWith('verify_button_')) {
      // Extract target user ID from customId
      const targetUserId = customId.replace('verify_button_', '');

      // Only the target user can click their own verify button
      if (userId !== targetUserId) {
        await interaction.reply({ embeds: [errorEmbed('This verification button is not for you.')], ephemeral: true });
        return;
      }

      // Verify the member
      const member = interaction.member;
      await verification.verifyMember(client, member, settings);

      await interaction.reply({ embeds: [successEmbed('You have been verified! Welcome to the server. 🎉')], ephemeral: true });
      return;
    }

    // ── CAPTCHA submit button — show modal ──────────────────────────────
    if (customId.startsWith('verify_captcha_submit_')) {
      const targetUserId = customId.replace('verify_captcha_submit_', '');

      // Only the target user can submit
      if (userId !== targetUserId) {
        await interaction.reply({ embeds: [errorEmbed('This CAPTCHA is not for you.')], ephemeral: true });
        return;
      }

      // Check if blocked due to too many attempts
      const attempts = parseInt(await client.redis.get(`verify:attempts:${guildId}:${userId}`) || '0', 10);
      if (attempts >= 3) {
        await interaction.reply({ embeds: [errorEmbed('You have exceeded the maximum number of attempts. Please wait and try again later.')], ephemeral: true });
        return;
      }

      // Show modal for CAPTCHA input
      const modal = new ModalBuilder()
        .setCustomId(`verify_captcha_modal_${userId}`)
        .setTitle('CAPTCHA Verification');

      const codeInput = new TextInputBuilder()
        .setCustomId('captcha_code')
        .setLabel('Enter the code shown in the image')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g. ABC123')
        .setRequired(true)
        .setMinLength(6)
        .setMaxLength(6);

      const actionRow = new ActionRowBuilder().addComponents(codeInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
      return;
    }
  } catch (err) {
    logger.error(`[Verification:interactionCreate] Button error: ${err.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [errorEmbed('An error occurred during verification. Please try again.')], ephemeral: true }).catch(() => {});
    }
  }
}

/**
 * Handles CAPTCHA modal submissions.
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {import('discord.js').Client} client
 */
async function handleModal(interaction, client) {
  const customId = interaction.customId;

  // Only handle verify_captcha_modal_ prefixed modals
  if (!customId.startsWith('verify_captcha_modal_')) return;

  try {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const targetUserId = customId.replace('verify_captcha_modal_', '');

    // Ensure the modal submitter is the target user
    if (userId !== targetUserId) {
      await interaction.reply({ embeds: [errorEmbed('This verification is not for you.')], ephemeral: true });
      return;
    }

    // Get the submitted code
    const input = interaction.fields.getTextInputValue('captcha_code');

    // Validate the CAPTCHA
    const result = await verification.validateCaptcha(client, userId, guildId, input);

    if (result.blocked) {
      await interaction.reply({
        embeds: [errorEmbed('You have exceeded the maximum number of attempts. Verification is temporarily blocked.')],
        ephemeral: true,
      });
      return;
    }

    if (!result.valid) {
      await interaction.reply({
        embeds: [warningEmbed(`Incorrect code. You have **${result.attemptsLeft}** attempt(s) remaining.`)],
        ephemeral: true,
      });
      return;
    }

    // CAPTCHA is valid — verify the member
    const guildDoc = await Guild.findOne({ guildId }).lean();
    const settings = guildDoc?.security?.verification;

    if (settings) {
      await verification.verifyMember(client, interaction.member, settings);
    }

    await interaction.reply({
      embeds: [successEmbed('CAPTCHA verified! You have been verified. Welcome to the server. 🎉')],
      ephemeral: true,
    });
  } catch (err) {
    logger.error(`[Verification:interactionCreate] Modal error: ${err.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [errorEmbed('An error occurred during verification. Please try again.')], ephemeral: true }).catch(() => {});
    }
  }
}
