# Project Intelligence Agent

An **agentic RAG platform for software and project intelligence**. It connects to
GitHub and Jira, synchronizes project data, and eventually answers questions
with evidence-backed, cited answers through LangGraph agent workflows.

> ⚠️ **Status: Foundation only.** This repository currently contains a clean,
> scalable monorepo skeleton with verified local infrastructure. No product
> features (GitHub/Jira sync, RAG, agents, MCP tools, memory, authentication,
> or the UI) are implemented yet. See [Project status](#project-status).

---

## 1. Overview

The system is being designed so these capabilities can be added cleanly later:

- Connect to **GitHub** and **Jira**
- Synchronize project data in the background (Redis + BullMQ)
- Store normalized source data (PostgreSQL)
- Semantic + structured retrieval (**pgvector**)
- Multi-step agent workflows (**LangGraph**), LLM/tool/retrieval abstractions
  (**LangChain**), **MCP** as the standardized agent-tool interface
- Short-term and long-term memory
- Evidence-backed answers with citations
- Tracing / observability / evaluation (**LangSmith**)
- **OpenCode Go** as the LLM provider

## 2. Monorepo architecture

```
project-intelligence-agent/
├── apps/
│   ├── web/                  # Next.js frontend (App Router, Tailwind v4, shadcn/ui, TanStack Query)
│   └── api/                  # Express backend (REST, future agents/integrations/workers)
├── packages/
│   ├── config/               # Shared constants + environment loading
│   ├── types/                # Shared TS types + Zod schemas
│   ├── database/             # Prisma schema, client, shared DB access
│   ├── ai/                   # LLM providers, LangGraph, retrieval, memory, observability
│   └── eslint-config/        # Shared flat ESLint config
├── docker/                   # Postgres init scripts
├── docker-compose.yml        # Local infra (PostgreSQL+pgvector, Redis)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── .env.example
```

## 3. Technology stack

| Layer             | Tools |
|-------------------|-------|
| Monorepo          | Turborepo, pnpm workspaces, TypeScript |
| Frontend          | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, TanStack Query, Zod |
| Backend           | Express 5, TypeScript, Zod, Prisma, PostgreSQL |
| AI                | LangChain, LangGraph, LangSmith SDK, OpenCode Go (provider) |
| Database          | PostgreSQL, pgvector, Prisma |
| Background jobs   | Redis, BullMQ, ioredis |
| Dev / infra       | Docker, Docker Compose, ESLint, Prettier, dotenv |

## 4. Prerequisites

- Node.js **20+** (tested on 24)
- pnpm **10+**
- Docker + Docker Compose
- (Optional) LangSmith account for tracing

## 5. Installation

```bash
pnpm install
```

## 6. Environment setup

Copy the example file and edit as needed:

```bash
cp .env.example .env
```

Key variables (see `.env.example` for the full list):

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://pia:pia@localhost:5432/pia` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `API_PORT` | Express API port | `4000` |
| `NEXT_PUBLIC_API_URL` | API base URL used by the frontend | `http://localhost:4000` |
| `CORS_ORIGIN` | Allowed browser origins (comma-separated) | `http://localhost:3000` |
| `LLM_PROVIDER` | LLM provider id | `opencode` |
| `LLM_MODEL` | Model name | `deepseek-v4-flash` |
| `LANGSMITH_TRACING` | Enable LangSmith tracing | `false` |

> **Port conflicts:** if ports `5432`/`6379` are already in use on your machine,
> start the infra on different host ports and mirror them in the env:
> ```bash
> $env:POSTGRES_PORT="5433"; $env:REDIS_PORT="6380"; docker compose up -d
> # .env
> DATABASE_URL=postgresql://pia:pia@localhost:5432/pia
> REDIS_URL=redis://localhost:6379
> ```

## 7. Starting Docker infrastructure

```bash
docker compose up -d          # PostgreSQL (pgvector) + Redis
docker compose logs -f        # follow logs
docker compose down           # stop (add -v to also wipe volumes)
```

The `vector` extension is enabled automatically on first startup via
`docker/postgres/init.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 8. Running database migrations

```bash
pnpm db:generate          # generate the Prisma client
pnpm db:migrate           # create & apply a new migration (dev)
pnpm db:migrate:deploy    # apply pending migrations (prod)
pnpm db:studio            # open Prisma Studio
```

The initial schema only defines a `HealthCheck` model to verify wiring.

### pgvector strategy (documented, not faked)

Prisma does not natively model a `vector` column. When vector search is added
we will use a raw SQL migration
(`CREATE EXTENSION IF NOT EXISTS vector; ... ADD COLUMN embedding vector(1536)`)
mapped with Prisma's `Unsupported("vector(1536)")` type, or store embeddings in
a dedicated migration-managed table. The extension is already enabled in the
container.

## 9. Running the frontend

```bash
pnpm dev:web
# http://localhost:3000
```

## 10. Running the backend

```bash
pnpm dev:api
# http://localhost:4000
```

Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/health/redis` | Redis ping check |
| GET | `/health/db` | PostgreSQL connectivity check |
| POST | `/dev/jobs/system` | (dev only) enqueue a test BullMQ job |

## 11. Running the full monorepo

```bash
pnpm dev          # starts web + api (dependencies built first)
pnpm build        # builds all workspaces
```

## 12. Available scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run web + api in dev mode |
| `pnpm dev:web` / `pnpm dev:api` | Run a single app |
| `pnpm build` | Build all workspaces (Turborepo) |
| `pnpm lint` | Lint all workspaces (ESLint) |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm db:generate` / `db:migrate` / `db:migrate:deploy` / `db:push` / `db:studio` | Prisma |
| `pnpm infra:up` / `infra:down` / `infra:logs` | Docker Compose |

## 13. Project status

**Complete (foundation):**

- Turborepo + pnpm monorepo with 7 workspaces
- Shared ESLint (flat) + Prettier + strict TypeScript base
- Next.js 16 frontend with Tailwind v4, shadcn/ui, TanStack Query, Zod
- Express 5 backend with Zod-validated env, CORS, centralized error handling
- PostgreSQL (pgvector) + Redis via Docker Compose
- Prisma package with a minimal `HealthCheck` model and migrations
- Redis client + BullMQ `system` queue/worker (dev verification path)
- AI package with provider abstraction, LangGraph/LangSmith placeholders
- Root `.env.example`, README, `.gitignore`

**Intentionally NOT implemented yet:**

- GitHub / Jira sync & integrations
- RAG / pgvector vector search
- LangGraph agent workflows
- MCP tools
- Memory (short/long term)
- LangSmith live tracing (disabled by default)
- Authentication
- Product UI / dashboard
- Production Docker images for web/api
- Real background jobs (only the test `system` queue exists)

## 14. Planned future architecture

```
                       ┌────────────────────────────┐
                       │         apps/web           │  Next.js UI
                       └─────────────┬──────────────┘
                                     │ REST
                       ┌─────────────▼──────────────┐
                       │         apps/api           │  Express
                       │  orchestrates agents        │
                       └───┬──────────┬──────────┬──┘
                           │          │          │
                 integrations│   workers │      MCP tools
             GitHub/Jira  │  BullMQ    │
             sync         │  Redis     │
                           ▼          ▼          ▼
              ┌─────────────┐  ┌──────────┐  ┌─────────┐
              │  packages/  │  │ Redis    │  │ Redis / │
              │  database   │  │ (jobs)   │  │ MCP     │
              │  (Prisma+   │  └──────────┘  └─────────┘
              │   pgvector) │
              └─────────────┘
                           ▲
              ┌────────────┴─────────────┐
              │       packages/ai        │  LangChain + LangGraph + LangSmith
              │  LLM provider abstraction│  └── OpenCode Go
              │  agents · retrieval      │  └── other providers
              │  memory · tools          │
              └──────────────────────────┘
```

### OpenCode Go LLM provider

The app is decoupled from any single provider. `packages/ai/src/providers/llm`
defines an `LLMProvider` abstraction that returns a LangChain `BaseChatModel`.
The OpenCode Go adapter is a **clearly marked placeholder** that throws until
the provider's real API/SDK/auth contract is confirmed — no fake integration is
shipped. Add the provider's required environment variables to `.env.example`
once known.
