# ==============================================================================
# Multi-stage Dockerfile for Cable Manufacturing Job-Work ERP Backend
# Node.js 22 Alpine for minimal footprint, speed, and security
# ==============================================================================

# Stage 1: Base image
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./

# Stage 2: Development stage (used by docker-compose for local dev)
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Stage 3: Builder stage (compiles TypeScript to JavaScript)
FROM base AS builder
ENV NODE_ENV=development
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 4: Production stage (lean production runtime)
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Run with non-privileged node user for security
USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 5000
CMD ["node", "dist/server.js"]
