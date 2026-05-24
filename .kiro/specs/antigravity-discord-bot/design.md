# Technical Design Document

## Overview

Antigravity is a monorepo containing three deployable units: the Discord bot (Node.js + Discord.js v14), the backend API (Express.js), and the dashboard frontend (Next.js). They share a MongoDB database (via Mongoose) and communicate in real-time through Redis pub/sub and Socket.io. The bot and API run in the same Node.js process (or can be split) behind PM2, while the dashboard deploys independently to Vercel.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Discord Gateway                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Bot Process (Node.js)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Command  │  │  Event   │  │ Service  │  │   Middleware  │   │
│  │ Handler  │  │  Handler │  │  Layer   │  │   (Guards)    │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│                        │                                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Shared Services (Security, Mod, etc.)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│   MongoDB Atlas  │  │    Redis     │  │  Express API │
│   (Mongoose)     │  │  (Cache/PubSub)│  │  (REST+WS)  │
└──────────────────┘  └──────────────┘  └──────┬───────┘
                                                │ JWT + Socket.io
                                                ▼
                                   ┌────────────────────────┐
                                   │  Next.js Dashboard     │
                                   │  (Vercel)              │
                                   └────────────────────────┘
```

## Components

### 1. Bot Core (`index.js`, `handlers/`, `config/`)

**Purpose:** Bootstrap the Discord client, load commands/events dynamically, connect to databases, and manage process lifecycle.

**Key Files:**
- `index.js` — Entry point. Initializes Discord.Client, connects Mongoose + Redis, loads handlers.
- `handlers/commandHandler.js` — Recursively reads `commands/` subdirectories, registers SlashCommandBuilder instances.
- `handlers/eventHandler.js` — Reads `events/` directory, attaches listeners by filename convention.
- `config/config.js` — Validates and exports environment variables.
- `config/constants.js` — Default thresholds, cooldowns, colors.

**Interfaces:**
```js
// Command file structure
module.exports = {
  data: SlashCommandBuilder,
  permissions: ['ModerateMembers'], // required Discord permissions
  cooldown: 5, // seconds
  execute: async (interaction, client) => {}
}

// Event file structure
module.exports = {
  name: 'messageCreate', // Discord.js event name
  once: false,
  execute: async (message, client) => {}
}
```

### 2. Database Layer (`database/`)

**Purpose:** Define Mongoose schemas, connection management, and model exports.

**Models:**

```js
// database/models/Guild.js
{
  guildId: { type: String, required: true, unique: true, index: true },
  prefix: { type: String, default: '!' },
  security: {
    antiRaid: { enabled: Boolean, joinThreshold: Number, joinWindow: Number, action: String },
    verification: { enabled: Boolean, method: String, minAccountAge: Number, timeout: Number },
    autoMod: { enabled: Boolean, filters: Object, escalation: [String], whitelist: { channels: [String], roles: [String] } },
    scamProtection: { enabled: Boolean, blacklistedDomains: [String] }
  },
  welcome: { enabled: Boolean, channelId: String, message: String, leaveMessage: String, autoRoles: [String], cardEnabled: Boolean },
  logging: { enabled: Boolean, channels: { moderation: String, messages: String, members: String, voice: String, server: String } },
  tickets: { enabled: Boolean, categoryId: String, types: [String], autoCloseHours: Number, staffRoles: [String] },
  leveling: { enabled: Boolean, xpPerMessage: Number, xpCooldown: Number, voiceXpPerMin: Number, rewardRoles: [{ level: Number, roleId: String }] },
  ai: { enabled: Boolean, provider: String, apiKey: String, rateLimit: Number },
  features: { type: Map, of: Boolean }
}

// database/models/User.js
{
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },
  warnings: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  dailyStreak: { type: Number, default: 0 },
  lastDaily: Date,
  lastXpGrant: Date
}
// Compound index: { guildId: 1, userId: 1 } unique

// database/models/Punishment.js
{
  caseId: { type: Number, required: true },
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true },
  action: { type: String, enum: ['warn', 'timeout', 'mute', 'kick', 'ban', 'unmute', 'unban'] },
  reason: String,
  duration: Number, // ms, null for permanent
  expiresAt: Date,
  active: { type: Boolean, default: true },
  notes: [{ content: String, authorId: String, createdAt: Date }],
  createdAt: { type: Date, default: Date.now }
}

// database/models/Ticket.js
{
  ticketId: { type: Number, required: true },
  guildId: { type: String, required: true, index: true },
  channelId: String,
  userId: String,
  type: { type: String, enum: ['support', 'report', 'purchase', 'partnership'] },
  status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  claimedBy: String,
  transcript: String, // HTML or URL
  createdAt: { type: Date, default: Date.now },
  closedAt: Date
}

// database/models/Reminder.js
{
  userId: String,
  guildId: String,
  channelId: String,
  message: String,
  remindAt: Date,
  createdAt: { type: Date, default: Date.now }
}
```

**Connection:** `database/connect.js` — Connects Mongoose with retry logic, emits ready event.

### 3. Security Services (`services/security/`)

**Purpose:** Encapsulate all security logic as reusable services called by event handlers.

**Files:**
- `services/security/antiRaid.js` — Tracks join timestamps in a sliding window (Redis sorted set). Exposes `checkJoinSpam(guild, member)`, `checkMentionSpam(message)`, `checkWebhookSpam(guild)`, `checkDeletionSpam(guild, executor)`.
- `services/security/verification.js` — Manages verification flow: assigns unverified role, generates CAPTCHA, handles button interactions, enforces timeout kicks.
- `services/security/autoMod.js` — Pipeline of filters. Each filter returns `{ triggered: boolean, reason: string, severity: number }`. Orchestrator applies escalation.
- `services/security/scamProtection.js` — URL extraction, pattern matching, VirusTotal API calls, domain blacklist checks.

**Anti-Raid Algorithm:**
```
joinTimestamps[guildId] = Redis SortedSet (score = timestamp)
On member join:
  ZADD joinTimestamps[guildId] NOW memberId
  ZREMRANGEBYSCORE joinTimestamps[guildId] -inf (NOW - window)
  count = ZCARD joinTimestamps[guildId]
  if count > threshold → triggerRaidMode(guild)
```

### 4. Moderation Services (`services/moderation/`)

**Purpose:** Execute moderation actions, manage cases, handle temporary punishment expiry.

**Files:**
- `services/moderation/punishmentManager.js` — Creates cases, applies Discord actions, schedules expiry via Redis TTL keys.
- `services/moderation/caseManager.js` — Auto-incrementing case IDs per guild, CRUD for notes.

**Temporary Punishment Expiry:**
```
On punishment create (if duration):
  SET punishment:expire:{guildId}:{caseId} "" EX duration_seconds
  
Redis keyspace notification on key expiry:
  → Look up case → Revert action (unban/unmute/untimeout)
```

### 5. Logging Service (`services/logging/`)

**Purpose:** Centralized event logging with channel routing and queue fallback.

**File:** `services/logging/logger.js`
- Accepts structured log events `{ guild, type, actor, target, action, reason, timestamp }`
- Routes to configured channel by type
- Falls back to Redis list queue if channel unavailable
- Background worker retries queued logs every 30s

### 6. Ticket Service (`services/tickets/`)

**Purpose:** Manage ticket lifecycle, transcript generation, analytics.

**File:** `services/tickets/ticketManager.js`
- `createTicket(guild, member, type)` — Creates channel, posts controls
- `closeTicket(ticket, closer)` — Generates transcript, archives, deletes channel
- `getAnalytics(guildId)` — Returns counts, avg resolution time

### 7. Leveling Service (`services/leveling/`)

**Purpose:** XP grants, level calculations, rank card generation.

**File:** `services/leveling/levelManager.js`
- `grantMessageXP(message)` — Cooldown check, XP grant, level-up check
- `grantVoiceXP(member, minutes)` — Called by voice state tracker
- `generateRankCard(user)` — Canvas-based rank card image
- `getLeaderboard(guildId, limit)` — Top N query

**Level Formula:** `xpForLevel(n) = 5 * n^2 + 50 * n + 100`

### 8. AI Service (`services/ai/`)

**Purpose:** Abstraction over AI providers for moderation assistance and Q&A.

**File:** `services/ai/aiManager.js`
- `analyzeToxicity(text)` — Returns score 0-1
- `answerFAQ(question, guildFAQs)` — Semantic match against configured FAQs
- `chat(prompt, context)` — General AI response with rate limiting

### 9. Express API (`api/`)

**Purpose:** REST endpoints for the dashboard, Discord OAuth2, JWT auth.

**Structure:**
```
api/
├── server.js          — Express app setup, middleware, Socket.io
├── routes/
│   ├── auth.js        — /api/auth/discord, /api/auth/callback, /api/auth/me
│   ├── guilds.js      — /api/guilds/:id/settings, /api/guilds/:id/stats
│   ├── moderation.js  — /api/guilds/:id/cases, /api/guilds/:id/warnings
│   ├── tickets.js     — /api/guilds/:id/tickets, transcripts
│   └── analytics.js   — /api/guilds/:id/analytics
├── middleware/
│   ├── auth.js        — JWT verification
│   ├── permissions.js — Guild permission check
│   └── rateLimit.js   — Per-IP and per-user rate limiting
└── socket/
    └── index.js       — Real-time updates to dashboard
```

**Auth Flow:**
1. Dashboard redirects to Discord OAuth2
2. Callback exchanges code for tokens
3. API fetches user guilds, filters by MANAGE_GUILD
4. Issues JWT with userId and guildIds
5. Subsequent requests validate JWT

### 10. Dashboard Frontend (`dashboard/`)

**Purpose:** Next.js app for visual bot management.

**Structure:**
```
dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              — Landing/login
│   ├── dashboard/
│   │   ├── layout.tsx        — Sidebar + guild selector
│   │   ├── [guildId]/
│   │   │   ├── page.tsx      — Home/stats
│   │   │   ├── security/
│   │   │   ├── moderation/
│   │   │   ├── tickets/
│   │   │   └── analytics/
├── components/
├── lib/
│   ├── api.ts               — Axios/fetch wrapper
│   ├── auth.ts              — OAuth helpers
│   └── socket.ts            — Socket.io client
├── styles/
└── next.config.js
```

**Tech:** Next.js 14 App Router, TailwindCSS, ShadCN UI components, Framer Motion for transitions, Recharts for analytics.

## Data Flow

### Message Processing Pipeline
```
messageCreate event
  → Verification check (is user verified?)
  → Auto-moderation pipeline (filters)
  → Scam protection (URL scan)
  → Leveling (XP grant)
  → Logging (message tracking)
```

### Configuration Update Flow
```
Dashboard → API (PATCH /guilds/:id/settings)
  → MongoDB update
  → Redis PUBLISH config:update:{guildId}
  → Bot SUBSCRIBE receives update
  → In-memory config cache refreshed
```

### Punishment Expiry Flow
```
Punishment created with duration
  → Redis SET with EX (TTL)
  → Redis keyspace notification on expiry
  → Bot receives notification
  → Reverts punishment (unban/unmute)
  → Updates Punishment document (active: false)
```

## Error Handling Strategy

1. **Unhandled Exceptions:** Global `process.on('uncaughtException')` and `process.on('unhandledRejection')` — log to file, do NOT crash.
2. **Discord API Errors:** Catch DiscordAPIError, handle rate limits (built into discord.js), log permission errors.
3. **Database Errors:** Mongoose connection retry with exponential backoff (1s, 2s, 4s, 8s, max 30s).
4. **Redis Errors:** Reconnect strategy built into ioredis, graceful degradation (skip cache, use DB directly).
5. **External API Errors:** VirusTotal, Weather, AI — timeout after 5s, return fallback response, log failure.

## Security Considerations

- All API routes require JWT authentication
- Guild-level permission checks on every API call
- Rate limiting on API (100 req/min per user, 1000 req/min per IP)
- Environment variables for all secrets (never committed)
- Input sanitization on all user-provided content
- MongoDB injection prevention via Mongoose schema validation
- CORS restricted to dashboard domain

## Deployment

### Bot + API (Docker/PM2)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["pm2-runtime", "ecosystem.config.js"]
```

### PM2 Ecosystem
```js
module.exports = {
  apps: [{
    name: 'antigravity-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production' }
  }]
}
```

### Dashboard (Vercel)
- Deployed via `vercel` CLI or GitHub integration
- Environment variables set in Vercel project settings
- API URL configured via `NEXT_PUBLIC_API_URL`
