# Base Image
FROM node:20-alpine AS builder

# Install build dependencies for native modules (like better-sqlite3)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy the applications
COPY discord-bot ./discord-bot
COPY web-dashboard ./web-dashboard
COPY db ./db
COPY start.js ./start.js

# Build Discord Bot
WORKDIR /app/discord-bot
RUN npm ci && npm run build && npm prune --production

# Build Next.js Dashboard
WORKDIR /app/web-dashboard
RUN npm ci && npm run build && npm prune --production

# Final runtime image
FROM node:20-alpine

# Install SQLite dependencies just in case
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy built resources from builder
COPY --from=builder /app/discord-bot /app/discord-bot
COPY --from=builder /app/web-dashboard /app/web-dashboard
COPY --from=builder /app/db /app/db
COPY --from=builder /app/start.js /app/start.js

# Create persistent storage folder for SQLite
RUN mkdir -p /app/data

# Expose Next.js Web port
EXPOSE 3000

# Environment variables defaults
ENV PORT=3000
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/nxbot.db

# Run start process runner orchestrator
CMD ["node", "start.js"]
