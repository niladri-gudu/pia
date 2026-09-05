# PIA — Project Status Report

> Generated: 2026-09-05
> Scope: full codebase audit of `apps/web`, `apps/api`, `packages/{ai,database,types,config}`
>
> **Note:** This supersedes the phase-tracking sections of `PIA-CURRECT-STATE.md`,
> which is significantly outdated (it claims background sync, chunking, embeddings,
> retrieval and the LangGraph agent are "not implemented" — all of those are now
> implemented and working).

---

## ✅ DONE

### 1. Foundation (Phase 0)
- Turborepo + pnpm monorepo (7 workspaces), strict TypeScript, shared ESLint (flat) + Prettier
- Next.js 16 + Tailwind v4 + shadcn/ui + TanStack Query skeleton (`apps/web`)
- Express 5 API with Zod env validation, CORS, centralized error handler (`apps/api/src/middleware/errorHandler.ts`)
- Docker infra: `pgvector/pgvector:pg16` + `redis:7-alpine`, `vector` extension enabled via `docker/postgres/init.sql`
- Health endpoints: `GET /health`, `/health/redis`, `/health/db`

### 2. GitHub Data Ingestion (Phase 1) — verified end-to-end
- Full integration at `apps/api/src/integrations/github/`:
  `github.client.ts`, `github.types.ts`, `github.mapper.ts` (issue/PR/commit →
  `NormalizedDocument`), `github.service.ts`, idempotent upsert
  `github.repository.ts`, `github.config.ts`, `github.factory.ts`
- Prisma models: `Workspace`, `Connection`, `Project`, `Document`, `SyncJob`
- Dev seed: `pia-dev-workspace` → GitHub connection → `facebook/react` project

### 3. Background Sync Engine (Phase 2)
- BullMQ queues `github-sync` + `embedding-index` with 5-attempt exponential
  backoff (`apps/api/src/workers/queues.ts`)
- `githubSyncWorker` with full SyncJob state machine
  (PENDING → RUNNING → COMPLETED/FAILED, `recordsProcessed`, `error`)
- `POST /dev/github/sync/:projectId` creates a SyncJob, guards concurrent syncs
  (409), enqueues, returns 202
- `GET /dev/github/sync/:projectId/status` endpoint

### 4. Chunking + Embeddings (Phase 3)
- Chunker + indexer in `packages/ai/src/indexing/` (1000 chars / 200 overlap defaults)
- Gemini embedding provider (`packages/ai/src/embeddings/gemini.ts`) —
  document/query task types, L2 normalization, 429 rate-limit retry
- `DocumentChunk` model with `embedding vector(768)`, migrations applied
- Embedding indexer worker (`apps/api/src/indexing/`)

### 5. Retrieval (Phase 4)
- pgvector cosine KNN (`1 - (embedding <=> $vec)`) with per-document dedup,
  topK=5 (`apps/api/src/retrieval/`)
- Activity/temporal retrieval: date-range resolution, `occurredAt`/PR `mergedAt`
  filters, document-type filters (`apps/api/src/retrieval/temporal.ts`,
  `activity.repository.ts`)
- `GET /dev/github/search/:projectId?q=` live semantic search

### 6. LangGraph Agent (Phase 5)
- Real multi-node graph at `apps/api/src/agent/`:
  decompose → retrieve → evaluate → refine (max 2 iterations) → context →
  generate, with `[Source N]` citations
- Exposed at `GET /dev/github/agent/:projectId?q=`

### 7. LLM / Embedding Providers
- OpenCode Go provider is real (`ChatOpenAI` against `https://opencode.ai/zen/go/v1`)
- Gemini embeddings provider

---

## ⚠️ PARTIAL

| Area | State |
|---|---|
| LangSmith | Env vars validated (`apps/api/src/config/env.ts`), real `langsmith` Client in `packages/ai/src/observability/index.ts`, dep installed. Tracing now wired explicitly into the agent graph (see Changelog). |
| Chunking trigger | ~~Sync does not auto-chunk~~ — **fixed**: github-sync worker now chains the `embedding-index` job on success. |
| packages/ai hygiene | Old throwing placeholder `packages/ai/src/langgraph/graph.ts` still exists alongside the real graph in `apps/api`; `AgentState` duplicated in two places; `langgraph/nodes`, `tools/`, `memory/` are `export {}`. |
| `.env.example` | ~~Out of sync with required env~~ — **fixed**: `GEMINI_API_KEY`, `EMBEDDING_*`, `LANGSMITH_*` now documented. |
| Web app | Only a health-card hero page. No dashboard, chat UI, connections UI, or project picker. |

---

## ❌ NOT IMPLEMENTED

- **Web UI** — dashboard, chat, connections management, sync status
- **Jira** integration (only enum values + commented env vars exist)
- **MCP tools** (`apps/api/src/mcp/index.ts` is an empty placeholder)
- **Memory** (short/long term)
- **Auth / users / workspaces-per-user**
- **Structured citations / Evidence model** (citations are `[Source N]` strings only)
- **ANN index** (ivfflat/hnsw) on the embedding column — sequential scan, fine for dev scale
- **Production hardening** — prod Docker images, credential encryption
  (`Connection.credentials` is plaintext), rate limiting, broader test coverage
- **GitHub App / per-workspace credentials** (global dev `GITHUB_TOKEN` only)

---

## 🐛 Known bugs / cleanup

- [x] `packages/types/src/index.ts` — `documentTypeSchema` used `z.object` instead of `z.enum` (**fixed**)
- [ ] Remove stale `packages/ai/src/langgraph/*` placeholder and de-duplicate `AgentState` (real one lives in `apps/api/src/agent/state.ts`)
- [ ] Dev routes use GET for agent/search (state-changing ops) — acceptable for dev, convert before productizing
- [ ] `SyncJob.cursor` field exists but is unused (pagination not implemented)
- [ ] README "Intentionally NOT implemented yet" section was stale (**updated**)

---

## Suggested next steps (priority order)

1. ✅ Wire LangSmith tracing explicitly into agent runs and verify traces in the LangSmith UI
2. ✅ Chain chunking/embedding automatically after github sync completes
3. ✅ Sync `.env.example` + fix stale docs
4. Web UI (Phase 6): dashboard + chat surface for the agent
5. Jira integration (client, mapper, queue — mirrors the GitHub pattern)
6. Memory + structured evidence/citation model
7. MCP tool interface
8. Auth + per-workspace credential encryption

---

## Changelog since previous status doc

- **LangSmith tracing**: explicit LangChain callback wiring added for the agent
  graph (`packages/ai/src/observability` → `createLangSmithCallbacks()`, used by
  `apps/api/src/agent/graph.ts`). Enable with `LANGSMITH_TRACING=true` +
  `LANGSMITH_API_KEY`.
- **Auto-indexing after sync**: the `githubSyncWorker` now enqueues an
  `embedding-index` job when a sync job completes, so documents are chunked and
  embedded without a manual reindex script.
- **`.env.example`** now includes `GEMINI_API_KEY`, `EMBEDDING_PROVIDER`,
  `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, and full `LANGSMITH_*` docs.
- **`documentTypeSchema`** fixed to a real `z.enum`.
- **README** status sections refreshed to reflect actual state.
