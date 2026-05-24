// ─────────────────────────────────────────────────────────────────────────────
// Ticket Routes — Ticket data and transcripts
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const Ticket = require('../../database/models/Ticket');
const { authenticate } = require('../middleware/auth');
const { checkGuildPermission } = require('../middleware/permissions');

const router = Router();

// All routes require authentication and guild permission
router.use('/:guildId/tickets', authenticate, checkGuildPermission);

// ── GET /api/guilds/:guildId/tickets — Returns paginated tickets with filters ─
router.get('/:guildId/tickets', async (req, res) => {
  try {
    const { guildId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    // Optional filters
    const filter = { guildId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.userId) filter.userId = req.query.userId;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ticket.countDocuments(filter),
    ]);

    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Tickets] Error fetching tickets:', error.message);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ── GET /api/guilds/:guildId/tickets/:ticketId/transcript — Returns transcript ─
router.get('/:guildId/tickets/:ticketId/transcript', async (req, res) => {
  try {
    const { guildId, ticketId } = req.params;

    const ticket = await Ticket.findOne({
      guildId,
      ticketId: parseInt(ticketId, 10),
    }).lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!ticket.transcript) {
      return res.status(404).json({ error: 'No transcript available for this ticket' });
    }

    res.json({ ticketId: ticket.ticketId, transcript: ticket.transcript });
  } catch (error) {
    console.error('[Tickets] Error fetching transcript:', error.message);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

module.exports = router;
