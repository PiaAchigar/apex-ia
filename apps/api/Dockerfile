# syntax=docker/dockerfile:1.7
# Build context expected: monorepo root (configured via railway.toml dockerfilePath)

FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# === Install all deps (devDeps included for typecheck) ===
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# === Typecheck (catch errors before deploy) ===
FROM deps AS build
COPY tsconfig.base.json turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages
RUN pnpm --filter=api build

# === Runtime: prune devDeps, run with tsx ===
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

# Bring source + node_modules from build stage, then prune devDeps
COPY --from=build /app /app
RUN pnpm prune --prod

# Baileys multi-device auth state — mount this as a persistent volume in Railway
RUN mkdir -p /app/apps/api/.baileys-sessions
VOLUME ["/app/apps/api/.baileys-sessions"]

WORKDIR /app/apps/api
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["pnpm", "start"]
