# Deployment guide

PIA is a standard three-tier web app with a background worker. Nothing about
it requires exotic infrastructure — the only hard requirements are
**PostgreSQL with the `pgvector` extension** and **Redis**.

## Topology

```
Web (Next.js)  ─┐
                ├─► API (Express)  ─► PostgreSQL 16 + pgvector
Worker (BullMQ)─┘        │    └────► Redis
        ▲________________│  (same queues; workers consume github-sync /
                             embedding-index)
```

| Component | Requirement | Example hosts |
|---|---|---|
| `apps/web` | Node 20+, static-ish SSR | Vercel, Railway, Fly.io |
| `apps/api` | Node 20+, persistent HTTP | Railway, Render, Fly.io |
| Worker | Same image as API, runs BullMQ consumers | Railway worker service, Render background worker, Fly machine |
| PostgreSQL | **pgvector extension** | Neon, Supabase, Railway, self-hosted |
| Redis | 6+ | Upstash, Railway, self-hosted |

Notes:

- The API process starts the BullMQ workers itself (see `apps/api/src/server.ts`),
  so a single API service is enough for small deployments. For production
  scale, run the API and a separate worker process from the same image
  (both call the same `startGithubSyncWorker`/`startEmbeddingIndexWorker`).
- The `vector` extension must be enabled on the database (the migration
  `20260901110000_enable_pgvector` runs `CREATE EXTENSION IF NOT EXISTS vector;`
  — the database role needs permission, or enable it once from the provider
  dashboard).

## Environment variables (production)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` — gates `/dev` routes off and switches logger verbosity |
| `DATABASE_URL` | yes | Postgres connection string (pgvector-enabled instance) |
| `REDIS_URL` | yes | Redis connection string |
| `OPENCODE_API_KEY` | yes | LLM provider key |
| `GEMINI_API_KEY` | yes | Embeddings |
| `GITHUB_TOKEN` | yes | Repository read access token |
| `API_PORT` | no | Default `4000` |
| `CORS_ORIGIN` | yes | Comma-separated list of the deployed web origins |
| `NEXT_PUBLIC_API_URL` | yes | Public API base URL for the web app |
| `LLM_PROVIDER` / `LLM_MODEL` | no | Defaults `opencode` / `deepseek-v4-flash` |
| `EMBEDDING_*` | no | Defaults match the schema (`vector(768)`) |
| `LANGSMITH_TRACING` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` | no | Observability |
| `EVALUATION_PROJECT_ID` | no | Only needed for `pnpm evaluate` |

Secrets are only ever read server-side; `NEXT_PUBLIC_*` values must not
contain secrets.

## Build & run

Both apps have multi-stage Dockerfiles (`apps/api/Dockerfile`,
`apps/web/Dockerfile`). The API image runs migrations, API and worker:

```bash
# API (and worker)
docker build -t pia-api -f apps/api/Dockerfile .
docker run --env-file .env.prod -p 4000:4000 pia-api

# Web
docker build -t pia-web -f apps/web/Dockerfile .
docker run --env-file .env.prod -p 3000:3000 pia-web
```

Migrations: run `pnpm db:migrate:deploy` once per release against the
production database (a release step on the API host, or a one-off job).

A production compose file (`docker-compose.prod.yml`) is provided for
self-hosting the full stack on a single VM.

## Post-deploy verification checklist

1. `GET /health`, `/health/redis`, `/health/db` all return `ok`
2. Web loads, dashboard lists the seeded project
3. **Sync now** completes and the status pill turns Indexed with a record count
4. Chat answers with `[Source N]` sources; sources link out to GitHub
5. An unsupported question returns an honest "could not verify" answer
6. Conversation survives a page refresh
7. With LangSmith enabled, traces appear and evaluation feedback attaches to runs
