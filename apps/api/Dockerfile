# syntax=docker/dockerfile:1

# ---- Base ------------------------------------------------------------------
FROM node:20-slim AS base
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Dependencies ----------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/ai/package.json packages/ai/
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN pnpm fetch

# ---- Build -----------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm install --frozen-lockfile --offline --ignore-scripts \
  && pnpm --filter @project-intelligence/api... build \
  && pnpm --filter @project-intelligence/api deploy --prod /out \
  && cp -r packages/database/prisma /out/node_modules/@project-intelligence/database/

# ---- Runtime ---------------------------------------------------------------
FROM base AS runtime
COPY --from=build /out /app
EXPOSE 4000
CMD ["node", "dist/server.js"]
