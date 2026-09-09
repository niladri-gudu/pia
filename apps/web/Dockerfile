# syntax=docker/dockerfile:1

# ---- Base ------------------------------------------------------------------
FROM node:20-slim AS base
RUN corepack enable
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
# NEXT_PUBLIC_API_URL is inlined into the client bundle at build time.
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile --offline --ignore-scripts \
  && pnpm --filter @project-intelligence/web... build \
  && pnpm --filter @project-intelligence/web deploy --prod /out \
  && mkdir -p /out/standalone \
  && cp -r apps/web/.next/standalone/. /out/standalone/ \
  && mkdir -p /out/standalone/apps/web/.next \
  && cp -r apps/web/.next/static /out/standalone/apps/web/.next/static \
  && mkdir -p /out/standalone/apps/web/public \
  && cp -r apps/web/public/. /out/standalone/apps/web/public/ || true

# ---- Runtime ---------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /out /app
EXPOSE 3000
CMD ["node", "standalone/apps/web/server.js"]
