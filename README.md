# Sahaj Wallet

A production-grade, multi-network Web3 wallet and rewards platform. Default
chain is **Arc**, default asset is **USDC**, default payment rail is
**Circle App Kit** — with every other supported chain (Ethereum, Base,
Polygon, Arbitrum, Optimism, Giwa) reached through the same blockchain-agnostic
adapter interface, so adding a network is a config change, not a rewrite.

## Architecture at a glance

```
apps/
  api/        Fastify v5 backend — auth, wallet, faucet, rewards, campaigns, tasks
  web/        React + Vite frontend — network switcher, unified balance, send, faucet, rewards
packages/
  shared-types/        Cross-cutting TypeScript types (NetworkConfig, TokenBalance, ...)
  branding-config/     Centralized brand theme — zero hardcoded colors anywhere else
  blockchain-adapters/ IBlockchainAdapter + one adapter per chain family (EVM, Arc, Giwa)
  circle-sdk/          Circle developer-controlled-wallets integration
  database/            Prisma schema + client (Postgres)
```

**Design principles this repo holds to:**
- No private key ever reaches the backend. External-wallet sends are signed
  entirely in the browser; the backend only verifies the resulting tx hash.
- USDC on Arc is native (6 decimals), not an ERC-20 — this is a first-class
  config flag (`usdcIsNative`) on `NetworkConfig`, not a scattered `if` check.
- Every brand color/font is a CSS custom property resolved at runtime from
  `packages/branding-config` — no component imports a color literal.
- Faucet requests are honest: if no real faucet API is configured, the user
  gets the official faucet link instead of a fabricated "success."

## Local development (without Docker)

Requires Node ≥ 20, pnpm ≥ 9, a local Postgres and Redis.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm db:migrate     # first time only — creates migration history
pnpm dev            # runs api (http://localhost:4000) + web (http://localhost:5173) together
```

## Running everything with Docker

Requires Docker and Docker Compose. This spins up Postgres, Redis, the API,
and the web app (served via nginx, which reverse-proxies `/api` to the API
container) with a single command.

```bash
cp .env.example .env
# edit .env — at minimum set JWT_SECRET, RPC URLs, and Circle credentials
docker compose up --build
```

- Web app: http://localhost:8080
- API directly: http://localhost:4000
- Postgres: localhost:5432 (user/pass/db: `sahaj`/`sahaj`/`sahaj_wallet`)
- Redis: localhost:6379

The `migrate` service runs once before `api` starts and syncs the Prisma
schema against Postgres (`prisma db push`, since this repo hasn't had its
first migration generated yet). Once you've run `pnpm db:migrate` locally
and committed the generated `packages/database/prisma/migrations/` folder,
switch `migrate`'s command in `docker-compose.yml` to
`prisma:deploy` for real migration history in staging/production.

To stop and remove containers (keeping data volumes):
```bash
docker compose down
```

To also wipe the database and Redis data:
```bash
docker compose down -v
```

### Building/running a single service

```bash
docker build -f apps/api/Dockerfile -t sahaj-api .
docker build -f apps/web/Dockerfile -t sahaj-web .
```

Both Dockerfiles install the full workspace (there's no committed
`pnpm-lock.yaml` yet in a fresh clone, so `pnpm install --no-frozen-lockfile`
is used deliberately) and then build only the target app via
`turbo run build --filter=<app>...`. Once you've run `pnpm install` locally
and committed the resulting lockfile, you can switch both Dockerfiles to
`pnpm install --frozen-lockfile` for fully reproducible builds.

## Environment variables

See `.env.example` (backend) and `apps/web/.env.example` (frontend) for the
full, commented list. Notably:
- `TREASURY_CIRCLE_WALLET_ID` — if unset, reward claims stay `pending` for
  manual processing instead of silently failing.
- `ARC_FAUCET_API_URL` / `GIWA_FAUCET_API_URL` — if unset, the in-app faucet
  button hands the user the official faucet link instead of guessing at an
  undocumented API.
- `GIWA_ENABLED` — Giwa is on by default per the multi-network spec.
