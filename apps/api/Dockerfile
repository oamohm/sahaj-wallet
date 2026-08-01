# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: install full workspace + build @sahaj/api and everything it needs
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate
WORKDIR /app

# Copy dependency manifests first so this layer caches across source-only changes.
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/branding-config/package.json packages/branding-config/package.json
COPY packages/blockchain-adapters/package.json packages/blockchain-adapters/package.json
COPY packages/circle-sdk/package.json packages/circle-sdk/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm --filter @sahaj/database prisma:generate
RUN pnpm turbo run build --filter=@sahaj/api...

# ---------------------------------------------------------------------------
# Stage 2: minimal runtime image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 sahaj && adduser --system --uid 1001 sahaj
COPY --from=builder --chown=sahaj:sahaj /app .

USER sahaj
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/index.js"]
