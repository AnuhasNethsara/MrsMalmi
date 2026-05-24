# ─────────────────────────────────────────────────────────────────────────────
# Mrs Malmi Discord Bot + API — Production Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine

# Install PM2 globally
RUN npm install -g pm2

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --production

# Copy application source
COPY . .

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start with PM2 runtime
CMD ["pm2-runtime", "ecosystem.config.js"]
