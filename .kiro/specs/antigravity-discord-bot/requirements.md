# Requirements Document

## Introduction

Antigravity is an all-in-one Discord bot built with Node.js and Discord.js v14, providing advanced security, moderation, utility, analytics, automation, and complete server management capabilities. The bot is paired with a Next.js dashboard for visual configuration and real-time monitoring. The system is designed for guild administrators who need a unified, scalable solution to protect, manage, and grow their Discord communities without juggling multiple bots.

The platform consists of three main components:
1. **Discord Bot Service** — Handles all in-guild interactions (commands, events, automated actions).
2. **Backend API** — Express.js + MongoDB layer that powers persistence, authentication, and dashboard data.
3. **Dashboard Frontend** — Next.js panel for server owners and moderators to configure, monitor, and analyze their server.

Branding: *Powered by ShiftLK Network. Designed & Developed by Anuhas Nethsara.*

## Requirements

### Requirement 1: Bot Core Infrastructure

**User Story:** As a developer, I want a modular bot foundation with command and event handlers, so that new features can be added cleanly and the bot remains maintainable as it grows.

#### Acceptance Criteria

1. WHEN the bot process starts THEN the system SHALL load environment variables from a `.env` file and validate that all required keys (DISCORD_TOKEN, CLIENT_ID, MONGO_URI, REDIS_URL, JWT_SECRET) are present.
2. WHEN the bot connects to Discord THEN it SHALL register all slash commands globally or per-guild based on configuration.
3. WHEN a slash command file is added under `commands/<category>/` THEN the command handler SHALL automatically discover and register it without code changes elsewhere.
4. WHEN an event handler file is added under `events/` THEN the event handler SHALL automatically attach the listener on startup.
5. IF the bot loses connection to Discord, MongoDB, or Redis THEN it SHALL attempt automatic reconnection with exponential backoff and log the failure.
6. WHEN the bot starts THEN it SHALL connect to MongoDB Atlas via Mongoose and Redis for caching/rate limiting.
7. WHEN any unhandled exception or rejection occurs THEN the bot SHALL log it to the `logs/` directory and remain online.

### Requirement 2: Security — Anti-Raid System

**User Story:** As a server owner, I want automated anti-raid protection, so that coordinated attacks (mass joins, mass mentions, channel/role deletion sprees) are detected and stopped without manual intervention.

#### Acceptance Criteria

1. WHEN more than N members join within a configurable time window THEN the system SHALL trigger raid mode and apply the configured action (lockdown, kick new joins, alert admins).
2. WHEN a single message contains more than the configured mention threshold THEN the system SHALL timeout the author and delete the message.
3. WHEN webhooks are created at a rate above the threshold THEN the system SHALL delete the offending webhooks and alert admins.
4. WHEN channels or roles are deleted at a rate above the threshold by a non-whitelisted user THEN the system SHALL strip that user's dangerous permissions and alert admins.
5. WHEN a bot is added to the guild by a non-whitelisted user THEN the system SHALL kick the bot and notify admins.
6. WHEN excessive emoji or nickname changes occur THEN the system SHALL apply timeouts per the configured policy.
7. WHEN raid mode is active THEN the system SHALL be able to lock down all public channels (deny @everyone send messages) and restore them on raid mode end.
8. WHILE raid mode is active THE system SHALL post status updates to the configured alert channel.

### Requirement 3: Security — Verification System

**User Story:** As a server owner, I want new members to verify before accessing the server, so that bots and bad actors are filtered out before they can cause harm.

#### Acceptance Criteria

1. WHEN a new member joins THEN the system SHALL assign an "Unverified" role and restrict access to all channels except the verification channel.
2. WHEN a member starts verification THEN the system SHALL offer at least one of: CAPTCHA, button click, or human verification timer (configurable).
3. WHEN a member completes verification THEN the system SHALL remove the unverified role and assign the configured verified role(s).
4. IF a member's account is younger than the configured minimum age (default 7 days) THEN the system SHALL block verification and notify the member.
5. IF a member does not verify within the configured timeout (default 1 hour) THEN the system SHALL kick the member.
6. WHEN verification fails N times THEN the system SHALL temporarily block further attempts from that user.

### Requirement 4: Security — Auto Moderation

**User Story:** As a moderator, I want the bot to automatically detect and act on rule-breaking messages, so that the server remains clean without 24/7 manual moderation.

#### Acceptance Criteria

1. WHEN a message is sent THEN the system SHALL evaluate it against enabled filters: spam, banned words, toxicity, scam links, invite links, excessive caps, duplicate messages, mention spam.
2. WHEN a filter triggers THEN the system SHALL apply the configured escalation: warn → timeout → mute → kick → ban.
3. WHEN a user accumulates configurable warning thresholds THEN the system SHALL automatically escalate to the next punishment level.
4. WHERE a channel or role is whitelisted THE system SHALL bypass auto-moderation for messages from those contexts.
5. WHEN auto-moderation acts THEN the system SHALL log the action with reason, evidence (message content), and case ID.

### Requirement 5: Security — Scam & Phishing Protection

**User Story:** As a server owner, I want links scanned for phishing and scam content, so that members are protected from credential theft and malware.

#### Acceptance Criteria

1. WHEN a message contains a URL THEN the system SHALL check it against the local blacklist, known scam patterns (fake Nitro, fake Discord domains), and the VirusTotal API.
2. IF the URL is flagged THEN the system SHALL delete the message, timeout the user, and log the incident.
3. WHEN a URL shortener is detected THEN the system SHALL expand and re-evaluate the destination URL.
4. IF the VirusTotal API is unavailable THEN the system SHALL fall back to local checks and log the API failure.
5. WHEN admins update the domain blacklist via the dashboard THEN the bot SHALL pick up changes within 60 seconds.

### Requirement 6: Moderation Commands

**User Story:** As a moderator, I want a complete set of moderation slash commands, so that I can enforce rules quickly with full audit history.

#### Acceptance Criteria

1. WHEN a moderator runs `/ban`, `/kick`, `/mute`, `/unmute`, `/warn`, `/warnings`, `/clear`, `/slowmode`, `/lock`, `/unlock`, `/nick`, or `/role` THEN the system SHALL execute the action subject to permission checks.
2. WHEN a punishment command is run THEN the system SHALL create a Punishment record with a unique Case ID, reason, duration (if applicable), and timestamps.
3. WHEN a temporary punishment expires THEN the system SHALL automatically revert it (untimeout, unmute, unban).
4. WHEN `/warnings` is run THEN the system SHALL return the user's full punishment history with case IDs and moderator notes.
5. IF the moderator lacks the required Discord permission or configured bot role THEN the system SHALL reject the command with a clear error.
6. WHEN a moderator adds a note to a case THEN the system SHALL persist the note attached to that case ID.

### Requirement 7: Logging System

**User Story:** As an admin, I want comprehensive event logging, so that I can audit everything that happens in my server.

#### Acceptance Criteria

1. WHEN any of the following events occur THEN the system SHALL log them to the configured channel: message delete, message edit, member join, member leave, voice channel activity, channel create/update/delete, role create/update/delete, moderation actions, invite usage.
2. WHEN logging an event THEN the system SHALL include timestamp, actor (user), action type, target, and reason where applicable.
3. WHERE separate log channels are configured per category THE system SHALL route events to the appropriate channel.
4. WHEN a member joins via an invite THEN the system SHALL track and log which invite code was used and who created it.
5. WHEN log channels become unavailable THEN the system SHALL queue events in Redis for retry up to a configurable limit.

### Requirement 8: Ticket System

**User Story:** As a server member, I want to open private tickets for support, reports, purchases, or partnerships, so that I can communicate with staff in a structured way.

#### Acceptance Criteria

1. WHEN a member clicks the ticket panel button THEN the system SHALL create a private channel under the configured category, accessible to the member and ticket staff.
2. WHEN a ticket is opened THEN the system SHALL post a welcome message with claim/close controls.
3. WHEN a ticket is closed THEN the system SHALL generate an HTML transcript and store it (database + optional channel post).
4. IF a ticket has no activity for the configured auto-close duration THEN the system SHALL warn the user, then close the ticket.
5. WHEN tickets are queried by analytics THEN the system SHALL return counts, average resolution time, and per-category breakdowns.

### Requirement 9: Utility Commands

**User Story:** As a server member, I want general-purpose utility commands, so that I can get information and perform common tasks without leaving Discord.

#### Acceptance Criteria

1. WHEN any of `/ping`, `/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/roleinfo`, `/remind`, `/poll`, `/embed`, `/weather`, `/calc`, `/help` is run THEN the system SHALL respond within 3 seconds under normal load.
2. WHEN `/remind` is set THEN the system SHALL store the reminder and DM or ping the user at the requested time, surviving bot restarts.
3. WHEN `/poll` is created THEN the system SHALL post an embed with reaction or button voting and tally results on completion.
4. IF a third-party API call (weather) fails THEN the system SHALL respond with a friendly error rather than crashing.

### Requirement 10: Welcome System

**User Story:** As a server owner, I want customizable welcome and leave messages, so that joining members feel greeted and the community sees activity.

#### Acceptance Criteria

1. WHEN a member joins THEN the system SHALL post the configured welcome embed (with optional generated welcome card image) to the configured channel.
2. WHEN a member leaves THEN the system SHALL post the configured leave embed.
3. WHEN auto-roles are configured THEN the system SHALL assign them on join, respecting verification flow if both are enabled.
4. WHERE placeholders such as `{user}`, `{server}`, `{memberCount}` are used in templates THE system SHALL substitute them at send time.

### Requirement 11: Leveling System

**User Story:** As a server member, I want to earn XP and levels for participating, so that engagement is rewarded.

#### Acceptance Criteria

1. WHEN a member sends a message (subject to anti-farm cooldown) THEN the system SHALL grant XP and persist it.
2. WHEN a member spends time in a voice channel (not muted/deafened/alone) THEN the system SHALL grant voice XP.
3. WHEN a member crosses a level threshold THEN the system SHALL post a level-up notification and assign reward roles if configured.
4. WHEN `/rank` is run THEN the system SHALL return a generated rank card with level, XP, and progress.
5. WHEN `/leaderboard` is run THEN the system SHALL return the top N members for the guild.
6. WHEN a member claims a daily reward THEN the system SHALL grant coins/XP once per 24 hours and track streaks.

### Requirement 12: AI System

**User Story:** As a moderator, I want AI-assisted moderation and Q&A, so that subtle rule violations are caught and common questions are answered automatically.

#### Acceptance Criteria

1. WHEN auto-moderation is uncertain about a message THEN the system SHALL be able to call a configured AI provider for a toxicity/sentiment score.
2. WHEN a member asks a question matching the configured FAQ THEN the system SHALL respond with the FAQ answer.
3. WHEN `/ask` (or equivalent AI command) is invoked THEN the system SHALL send the prompt to the configured AI provider and return the response, subject to per-guild rate limits.
4. IF the AI provider is unavailable or rate-limited THEN the system SHALL respond with a graceful fallback and log the failure.
5. WHERE AI features are disabled by the guild THE system SHALL skip all AI calls for that guild.

### Requirement 13: Backend API

**User Story:** As a dashboard user, I want a secure API that exposes bot data and configuration, so that the dashboard can read and write settings.

#### Acceptance Criteria

1. WHEN a user authenticates via Discord OAuth2 THEN the API SHALL issue a JWT and return the user's accessible guilds.
2. WHEN the API receives a request THEN it SHALL validate the JWT and verify the user has Manage Server permission on the target guild.
3. WHEN configuration is updated via the API THEN changes SHALL be persisted to MongoDB and broadcast to the bot via Redis pub/sub or Socket.io for near-real-time effect.
4. WHEN the API is rate-limited (per IP and per user) THEN excess requests SHALL be rejected with 429.
5. WHEN sensitive endpoints are accessed THEN the API SHALL log the actor, target guild, and change diff.

### Requirement 14: Dashboard Frontend

**User Story:** As a server administrator, I want a web dashboard, so that I can configure the bot, view analytics, and manage moderation visually instead of via commands.

#### Acceptance Criteria

1. WHEN a user logs in via Discord OAuth2 THEN the dashboard SHALL display only guilds where they have Manage Server.
2. WHEN a guild is selected THEN the dashboard SHALL display Home, Security, Moderation, Tickets, and Analytics sections.
3. WHEN settings are changed THEN the dashboard SHALL save with optimistic UI and surface API errors clearly.
4. WHEN Analytics is opened THEN the dashboard SHALL render charts for join growth, message activity, user activity, and moderation actions over selectable time ranges.
5. WHEN the Tickets section is opened THEN the dashboard SHALL list tickets with filters and allow downloading transcripts.
6. WHERE the bot is offline or disconnected THE dashboard SHALL show a clear status indicator.

### Requirement 15: Data Models & Persistence

**User Story:** As a developer, I want well-defined Mongoose schemas, so that data is consistent and queryable.

#### Acceptance Criteria

1. WHEN a User document is created THEN it SHALL include UserID, guild-scoped XP, Level, Warnings, Coins, Reputation.
2. WHEN a Guild document is created THEN it SHALL include GuildID, Prefix, SecuritySettings, WelcomeSettings, LogSettings, and feature toggles.
3. WHEN a Punishment document is created THEN it SHALL include CaseID, GuildID, UserID, ModeratorID, Reason, Duration, ActionType, Timestamp, and Notes.
4. WHEN a guild is removed (bot kicked) THEN the system SHALL retain data for a configurable retention period before deletion.
5. WHEN documents are queried THEN appropriate indexes (GuildID, UserID, CaseID) SHALL ensure sub-100ms reads on typical lookups.

### Requirement 16: Deployment & Operations

**User Story:** As a developer, I want a reproducible deployment setup, so that the bot, API, and dashboard can be released and scaled reliably.

#### Acceptance Criteria

1. WHEN the project is built THEN a Dockerfile SHALL produce a runnable image for the bot+API service.
2. WHEN running on a VPS THEN PM2 ecosystem config SHALL manage process lifecycle, logs, and auto-restart.
3. WHEN the dashboard is deployed THEN it SHALL be deployable to Vercel with environment variables documented in `.env.example`.
4. WHEN MongoDB Atlas is the configured database THEN connection strings and IP allowlists SHALL be documented in setup instructions.
5. WHEN logs are written THEN they SHALL rotate by size/date and be available under `logs/`.
6. WHEN the system is deployed THEN healthcheck endpoints (`/health` for API, internal status for bot) SHALL be available for monitoring.
