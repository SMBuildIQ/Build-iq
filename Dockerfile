FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./build.db"
RUN npx prisma generate && npx prisma db push && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Production target is PostgreSQL (any postgresql:// DATABASE_URL is absolute
# and unaffected by the note below) — see ARCHITECTURE.md. For the SQLite
# fallback path used by docker-compose.yml, DATABASE_URL MUST be an absolute
# file: path, e.g. file:/app/data/prod.db — Next's standalone output copies
# the generated Prisma client to a new location at build time, and Prisma
# resolves a *relative* sqlite datasource path against wherever that copy
# ends up (not this container's WORKDIR), so a relative path silently points
# at the wrong file. AUTH_SECRET must also be provided at runtime (32+ chars).
# Do not bake secrets into the image.
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# scripts/worker.ts runs under tsx (not the Next.js build), importing straight
# from src/ with @/ path aliases — it needs the TypeScript source and
# tsconfig.json present at runtime, neither of which the standalone Next.js
# output includes on its own.
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# No versioned migrations exist yet (dev has only used `prisma db push` — see
# DATABASE_SCHEMA.md); switch this to `prisma migrate deploy` once migrations are
# generated for the PostgreSQL target. The web process and the job worker
# (npm run worker) are separate containers in docker-compose.yml / production —
# this default CMD runs the web server only.
CMD ["sh", "-c", "npx prisma db push && node server.js"]
