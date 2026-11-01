# ==============================================================================
# Ultra-Optimized Multi-Stage Dockerfile for Next.js App
# Standalone Output + Non-root Security (~100-150MB image)
# ==============================================================================

# Stage 1: Base image
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10 && apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Install dependencies using BuildKit pnpm store cache
FROM base AS dependencies
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --no-frozen-lockfile

# Stage 3: Build application
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL="https://bserver.mfolks.com/api/v1"

RUN pnpm run build

# Stage 4: Lean Production Runner Image (~120-150MB)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone build output
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
