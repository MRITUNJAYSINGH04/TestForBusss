# ==============================================================================
# God's Eye for Business — Next.js 3D Globe Frontend Container
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and static assets
COPY frontend/ ./

# Build Next.js production bundle
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "start"]
