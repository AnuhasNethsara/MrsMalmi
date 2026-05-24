# Mrs Malmi — Advanced Discord Bot

A comprehensive Discord bot with security, moderation, ticketing, leveling, and AI features, paired with a web dashboard for server management.

## Features

- **Security** — Anti-raid protection, CAPTCHA verification, auto-moderation filters, scam/phishing detection
- **Moderation** — Ban, kick, mute, warn, clear, slowmode, lock/unlock with case tracking
- **Tickets** — Panel-based ticket creation, claiming, HTML transcript generation
- **Leveling** — Message & voice XP, rank cards, leaderboards, daily rewards
- **Logging** — Comprehensive audit logging for messages, members, channels, roles, voice
- **Welcome** — Canvas-based welcome cards, auto-roles, custom messages
- **AI** — Toxicity analysis, FAQ matching, /ask command
- **Utility** — Polls, reminders, weather, calculator, embeds, server/user info
- **Dashboard** — Next.js web dashboard with real-time updates via Socket.io

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Bot | Discord.js v14, Node.js 20 |
| Database | MongoDB (Mongoose) |
| Cache | Redis (ioredis) |
| API | Express.js, Socket.io |
| Dashboard | Next.js 14, TailwindCSS, Recharts |
| Auth | Discord OAuth2, JWT |
| Process Manager | PM2 |
| Containerization | Docker, Docker Compose |

## Prerequisites

- Node.js 20+
- MongoDB 7+
- Redis 7+
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

## Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd mrs-malmi
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see Environment Variables below).

### 3. Run (Development)

```bash
node index.js
```

### 4. Run (Docker)

```bash
docker-compose up -d
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | ✅ |
| `DISCORD_CLIENT_ID` | Application client ID | ✅ |
| `DISCORD_CLIENT_SECRET` | Application client secret (for OAuth2) | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `REDIS_URL` | Redis connection URL | ✅ |
| `JWT_SECRET` | Secret for signing JWT tokens | ✅ |
| `API_PORT` | Port for the REST API (default: 3001) | ❌ |
| `API_CORS_ORIGIN` | Allowed CORS origin for dashboard | ❌ |
| `OPENAI_API_KEY` | OpenAI API key for AI features | ❌ |
| `VIRUSTOTAL_API_KEY` | VirusTotal API key for scam detection | ❌ |
| `WEATHER_API_KEY` | Weather API key for /weather command | ❌ |

## Project Structure

```
mrs-malmi/
├── index.js              # Bot entry point
├── commands/             # Slash commands (by category)
│   ├── moderation/
│   ├── security/
│   ├── tickets/
│   ├── utility/
│   ├── management/
│   └── fun/
├── events/               # Event handlers
│   ├── antiRaid/
│   ├── autoMod/
│   ├── leveling/
│   ├── logging/
│   ├── moderation/
│   ├── tickets/
│   ├── utility/
│   ├── verification/
│   └── welcome/
├── services/             # Business logic
│   ├── security/
│   ├── moderation/
│   ├── tickets/
│   ├── leveling/
│   ├── logging/
│   ├── welcome/
│   └── ai/
├── database/             # MongoDB models & connection
├── handlers/             # Command & event loaders
├── api/                  # REST API + Socket.io
│   ├── routes/
│   ├── middleware/
│   └── socket/
├── dashboard/            # Next.js web dashboard
├── config/               # Configuration files
├── utils/                # Shared utilities
└── logs/                 # Log files (gitignored)
```

## Dashboard

The web dashboard is a separate Next.js application in the `dashboard/` directory.

### Setup

```bash
cd dashboard
npm install
npm run dev
```

### Deployment (Vercel)

1. Connect the `dashboard/` directory to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — Your backend API URL
   - `NEXT_PUBLIC_DISCORD_CLIENT_ID` — Discord application client ID
3. Deploy

## Deployment

### Docker (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f bot

# Stop
docker-compose down
```

### PM2 (Manual)

```bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem config
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs mrs-malmi-bot
```

### Health Check

The API exposes a health endpoint:

```
GET /api/health
Response: { "status": "ok", "uptime": 12345.67 }
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -am 'Add my feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

ISC
