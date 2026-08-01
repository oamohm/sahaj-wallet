# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: install full workspace + build the static @sahaj/web bundle
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.1 --activate
WORKDIR /app

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

# Build-time env: which brand to bake into the static bundle (Vite env vars
# are compile-time). Override with --build-arg for a white-label build.
ARG VITE_ACTIVE_BRAND=sahaj
ENV VITE_ACTIVE_BRAND=${VITE_ACTIVE_BRAND}
RUN pnpm turbo run build --filter=@sahaj/web...

# ---------------------------------------------------------------------------
# Stage 2: minimal nginx runtime serving the static bundle
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
