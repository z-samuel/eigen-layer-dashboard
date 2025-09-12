# Multi-stage Dockerfile for EigenLayer Dashboard
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY lib/package.json ./lib/
COPY indexer/package.json ./indexer/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build lib package
RUN yarn lib:build

# Build frontend
RUN yarn frontend:build

# Build backend
RUN yarn backend:build

# Production stage
FROM node:18-slim AS production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    dumb-init \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY --from=base --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nextjs:nodejs /app/yarn.lock ./yarn.lock

# Copy built applications
COPY --from=base --chown=nextjs:nodejs /app/lib/dist ./lib/dist
COPY --from=base --chown=nextjs:nodejs /app/lib/package.json ./lib/
COPY --from=base --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=base --chown=nextjs:nodejs /app/backend/package.json ./backend/
COPY --from=base --chown=nextjs:nodejs /app/backend/tsconfig.json ./backend/
COPY --from=base --chown=nextjs:nodejs /app/indexer/package.json ./indexer/
COPY --from=base --chown=nextjs:nodejs /app/indexer/src ./indexer/src
COPY --from=base --chown=nextjs:nodejs /app/indexer/tsconfig.json ./indexer/
COPY --from=base --chown=nextjs:nodejs /app/frontend/build ./frontend/build
COPY --from=base --chown=nextjs:nodejs /app/frontend/package.json ./frontend/

# Copy node_modules for production
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nextjs:nodejs /app/lib/node_modules ./lib/node_modules
COPY --from=base --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=base --chown=nextjs:nodejs /app/indexer/node_modules ./indexer/node_modules
COPY --from=base --chown=nextjs:nodejs /app/frontend/node_modules ./frontend/node_modules

# Install all dependencies to ensure proper linking and runtime requirements
# Add retry logic for network issues
RUN yarn install --frozen-lockfile --network-timeout 100000 --network-concurrency 1

# Create database directory and copy existing database if it exists
RUN mkdir -p /app/indexer && chown -R nextjs:nodejs /app/indexer && chmod -R 755 /app/indexer

# Database will be created by the indexer automatically

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/graphql', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
