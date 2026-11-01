# ==============================================================================
# Ultra-Optimized Multi-Stage Dockerfile for Express + TypeScript Backend
# Using Alpine Linux + Corepack pnpm + Non-root Security
# ==============================================================================

# Stage 1: Base image with Corepack pnpm
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Dependencies installation with BuildKit cache mounts
FROM base AS dependencies
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install; \
    fi

# Stage 3: Builder stage (transpiles TypeScript to dist/)
FROM base AS builder
COPY package.json pnpm-lock.yaml* tsconfig.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY src ./src
RUN pnpm run build

# Stage 4: Production dependencies only
FROM base AS prod-dependencies
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    if [ -f pnpm-lock.yaml ]; then \
      pnpm install --prod --frozen-lockfile; \
    else \
      pnpm install --prod; \
    fi

# Stage 5: Production Lean Runner Image (~140MB)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Security: Dedicated unprivileged node user
USER node

# Copy only production dependencies and compiled artifacts
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=prod-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]
