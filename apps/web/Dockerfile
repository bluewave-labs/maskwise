# Multi-stage build for production optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY turbo.json ./
COPY packages/database/package.json ./packages/database/
COPY apps/web/package*.json ./apps/web/

# Install dependencies using lockfile for deterministic builds
RUN npm ci --only=production

# Copy source code after dependencies for better layer caching
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN cd apps/web && npm run build

# Production stage with minimal footprint
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built Next.js application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

USER nextjs

EXPOSE 3000

# Health check for web service
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]