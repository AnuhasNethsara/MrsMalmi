// ─────────────────────────────────────────────────────────────────────────────
// Guild Settings Routes
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const Guild = require('../../database/models/Guild');
const { authenticate } = require('../middleware/auth');
const { checkGuildPermission } = require('../middleware/permissions');

const router = Router();

// All routes require authentication and guild permission
router.use('/:guildId/settings', authenticate, checkGuildPermission);

// ── GET /api/guilds/:guildId/settings — Returns guild settings ────────────────
router.get('/:guildId/settings', async (req, res) => {
  try {
    const { guildId } = req.params;

    let settings = await Guild.findOne({ guildId }).lean();

    if (!settings) {
      // Create default settings if none exist
      settings = await Guild.create({ guildId });
      settings = settings.toObject();
    }

    res.json(settings);
  } catch (error) {
    console.error('[Guilds] Error fetching settings:', error.message);
    res.status(500).json({ error: 'Failed to fetch guild settings' });
  }
});

// ── PATCH /api/guilds/:guildId/settings — Updates guild settings ──────────────
router.patch('/:guildId/settings', async (req, res) => {
  try {
    const { guildId } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const settings = await Guild.findOneAndUpdate(
      { guildId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    // Publish config change via Redis for real-time updates
    const client = req.app.get('discordClient');
    if (client && client.redis) {
      await client.redis.publish(
        'guild:settings:update',
        JSON.stringify({ guildId, updates, updatedBy: req.user.id })
      );
    }

    res.json(settings);
  } catch (error) {
    console.error('[Guilds] Error updating settings:', error.message);
    res.status(500).json({ error: 'Failed to update guild settings' });
  }
});

module.exports = router;
