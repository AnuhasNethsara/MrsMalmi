// ─────────────────────────────────────────────────────────────────────────────
// Moderation Routes — Cases and notes
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const Punishment = require('../../database/models/Punishment');
const { authenticate } = require('../middleware/auth');
const { checkGuildPermission } = require('../middleware/permissions');

const router = Router();

// All routes require authentication and guild permission
router.use('/:guildId/cases', authenticate, checkGuildPermission);

// ── GET /api/guilds/:guildId/cases — Returns paginated cases ──────────────────
router.get('/:guildId/cases', async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    // Optional filters
    const filter = { guildId };
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.active !== undefined) filter.active = req.query.active === 'true';

    const [cases, total] = await Promise.all([
      Punishment.find(filter).sort({ caseId: -1 }).skip(skip).limit(limit).lean(),
      Punishment.countDocuments(filter),
    ]);

    res.json({
      cases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Moderation] Error fetching cases:', error.message);
    res.status(500).json({ error: 'Failed to fetch moderation cases' });
  }
});

// ── GET /api/guilds/:guildId/cases/:caseId — Returns single case ──────────────
router.get('/:guildId/cases/:caseId', async (req, res) => {
  try {
    const { guildId, caseId } = req.params;

    const modCase = await Punishment.findOne({
      guildId,
      caseId: parseInt(caseId, 10),
    }).lean();

    if (!modCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(modCase);
  } catch (error) {
    console.error('[Moderation] Error fetching case:', error.message);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// ── POST /api/guilds/:guildId/cases/:caseId/notes — Adds a note ──────────────
router.post('/:guildId/cases/:caseId/notes', async (req, res) => {
  try {
    const { guildId, caseId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const modCase = await Punishment.findOneAndUpdate(
      { guildId, caseId: parseInt(caseId, 10) },
      {
        $push: {
          notes: {
            content: content.trim(),
            authorId: req.user.id,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean();

    if (!modCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.status(201).json(modCase);
  } catch (error) {
    console.error('[Moderation] Error adding note:', error.message);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

module.exports = router;
