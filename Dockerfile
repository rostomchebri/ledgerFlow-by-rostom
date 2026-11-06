# syntax=docker/dockerfile:1.7
# OPS-01 — production image for the Next.js web app, the pg-boss worker, and
# one-shot Prisma migrations. Build once, promote the same image.
#
# Build:  docker build -t ledgerflow:latest .
# Web:    docker build --target runner   -t ledgerflow-web:latest .
# Worker: docker build --target worker   -t ledgerflow-worker:latest .
# Migrate:docker build --target migrator -t ledgerflow-migrator:latest .

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Build the Next.js standalone server
# ---------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The build must not need a live database. Runtime values are injected by the
# orchestrator; these placeholders only satisfy env validation during build.
ENV NODE_ENV=production \
    NEXT_STANDALONE=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public \
    DATABASE_URL_UNPOOLED=postgresql://build:build@localhost:5432/build?schema=public \
    BETTER_AUTH_SECRET=build-only-secret-replaced-at-runtime-000000 \
    BETTER_AUTH_URL=http://localhost:3000 \
    NEXT_PUBLIC_APP_URL=http://localhost:3000

RUN pnpm prisma generate && pnpm build

# ---------------------------------------------------------------------------
# Runtime — standalone web server (non-root, minimal surface)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/prisma ./prisma
# Prisma's client, engine, and pnpm-store layout are already inside the
# standalone trace; copying `node_modules/.prisma` or `node_modules/@prisma`
# from the project root breaks because Prisma 6 generates into the pnpm store.

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:3000/api/health" >/dev/null || exit 1

CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# Migrations — one-shot Prisma deploy using the full toolchain
# ---------------------------------------------------------------------------
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
CMD ["pnpm", "db:deploy"]

# ---------------------------------------------------------------------------
# Worker — pg-boss supervision + scheduled reminder sweep (NOTIF-02/03)
# ---------------------------------------------------------------------------
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY prisma ./prisma
COPY messages ./messages
RUN pnpm prisma generate
CMD ["pnpm", "jobs:worker"]
