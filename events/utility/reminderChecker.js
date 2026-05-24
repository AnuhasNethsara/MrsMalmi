// ─────────────────────────────────────────────────────────────────────────────
// Event: reminderChecker — Checks for due reminders every 30 seconds
// ─────────────────────────────────────────────────────────────────────────────

const { Events } = require('discord.js');
const Reminder = require('../../database/models/Reminder');
const { createEmbed } = require('../../utils/embed');
const { COLORS } = require('../../config/constants');

module.exports = {
  name: Events.ClientReady,
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    console.log('[Reminders] Starting reminder checker (interval: 30s)');

    // Check every 30 seconds
    setInterval(async () => {
      try {
        const dueReminders = await Reminder.find({
          sent: false,
          remindAt: { $lte: new Date() },
        }).limit(20);

        for (const reminder of dueReminders) {
          try {
            // Try to send in the original channel
            const channel = await client.channels.fetch(reminder.channelId).catch(() => null);

            const embed = createEmbed({
              title: '⏰ Reminder',
              description: reminder.message,
              color: COLORS.info,
              fields: [
                { name: 'Set', value: `<t:${Math.floor(reminder.createdAt.getTime() / 1000)}:R>`, inline: true },
              ],
            });

            if (channel) {
              await channel.send({
                content: `<@${reminder.userId}>`,
                embeds: [embed],
              });
            } else {
              // Fallback: try to DM the user
              const user = await client.users.fetch(reminder.userId).catch(() => null);
              if (user) {
                await user.send({ embeds: [embed] }).catch(() => {});
              }
            }

            // Mark as sent
            reminder.sent = true;
            await reminder.save();
          } catch (err) {
            // Mark as sent to avoid infinite retries on broken reminders
            reminder.sent = true;
            await reminder.save();
            console.error(`[Reminders] Failed to deliver reminder ${reminder._id}: ${err.message}`);
          }
        }
      } catch (err) {
        console.error(`[Reminders] Error checking reminders: ${err.message}`);
      }
    }, 30000);
  },
};
