# Base Image
FROM node:22-alpine AS builder

# Install build dependencies for native modules (like better-sqlite3)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy the applications
COPY discord-bot ./discord-bot
COPY web-dashboard ./web-dashboard
COPY db ./db
COPY scripts ./scripts

# Build Discord Bot
WORKDIR /app/discord-bot
RUN npm ci && npm run build && npm prune --production && npm cache clean --force

# Build Next.js Dashboard
WORKDIR /app/web-dashboard
RUN npm ci && npm run build && npm prune --production && npm cache clean --force

# Remove Next.js build cache (not needed at runtime)
RUN rm -rf /app/web-dashboard/.next/cache

# Final runtime image
FROM node:22-alpine

# Install SQLite dependencies just in case
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy built resources from builder
COPY --from=builder /app/discord-bot /app/discord-bot
COPY --from=builder /app/web-dashboard /app/web-dashboard
COPY --from=builder /app/db /app/db
COPY --from=builder /app/scripts /app/scripts

# Create persistent storage folder for SQLite
RUN mkdir -p /app/data

# Expose Next.js Web port
EXPOSE 7000

# Environment variables defaults
ENV PORT=7000
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/nxbot.db

# Run start process runner orchestrator
CMD ["node", "scripts/start.js"]
