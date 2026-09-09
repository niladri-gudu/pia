# Project Intelligence Agent

An **agentic RAG system for asking grounded questions about live engineering
project data**.

PIA connects to a GitHub repository, synchronizes its issues, pull requests
and commits into a normalized knowledge base (PostgreSQL + pgvector), and
answers natural-language questions with cited, evidence-backed answers
through a LangGraph agent — with retrieval refinement, project memory,
guardrails, and LangSmith observability.

```
GitHub / project data
        ↓
     Sync layer (BullMQ + Redis, idempotent)
        ↓
Normalization → Documents → Chunking → Embeddings
        ↓
PostgreSQL + pgvector
────────────────────────────
        AI Agent (LangGraph)
────────────────────────────
   ↓                ↓
Memory retrieval   Query decomposition
   ↓                ↓
Semantic / Activity / Hybrid retrieval
   ↓
Evidence evaluation → Refinement loop (max 2 iterations)
   ↓
Context construction → LLM generation → Output guardrails
   ↓
Grounded answer + [Source N] citations
```

---

## Why I built this

Engineering knowledge is fragmented across pull requests, issues, commits and
project activity. PIA turns that fragmented data into a searchable,
conversational intelligence layer — and it is deliberately **not an LLM
wrapper**: every answer must be grounded in retrieved project evidence,
validated by an evidence-evaluation step, refined when insufficient, and
checked by guardrails before it reaches the user.

## Features

- **GitHub ingestion** — real GitHub REST integration (issues, PRs, commits)
  normalized into a provider-independent `NormalizedDocument` abstraction,
  with idempotent upserts (re-syncing never duplicates).
- **Background sync engine** — BullMQ queues (`github-sync`,
  `embedding-index`) with retries, exponential backoff and a full SyncJob
  state machine; a successful sync automatically chains chunking +
  embedding.
- **RAG pipeline** — document chunking (1000 chars / 200 overlap), Gemini
  embeddings, pgvector cosine KNN with per-document deduplication.
- **Temporal & activity retrieval** — relative date-range resolution
  ("this week", "last month"), `occurredAt`/`mergedAt` filtering, document
  type filters, exhaustive mode.
- **Agentic retrieval (LangGraph)** — query decomposition into 1–5 retrieval
  plans (semantic / activity / hybrid), evidence evaluation, and a refinement
  loop that generates targeted follow-up retrieval plans (max 2 iterations).
- **Project memory** — durable facts/decisions/preferences extracted from
  conversations, embedded, semantically deduplicated (≥ 0.9 similarity) and
  recalled on relevant questions; always distinguished from source evidence.
- **Guardrails** — input validation (length/emptiness) and output validation:
  every `[Source N]` citation must reference a retrieved chunk, and answers
  without sufficient evidence must acknowledge uncertainty (otherwise a safe
  fallback response is served).
- **Persistent conversations** — messages, citations and used memories are
  stored; conversations auto-title and survive refreshes.
- **Evaluation** — an LLM-as-judge evaluation dataset scored 0–1 per case,
  with scores pushed to LangSmith as feedback on the actual agent runs.
- **Observability** — LangSmith tracing of every agent run: query →
  decomposition → retrieval → evaluation → refinement → generation.
- **Two-theme web UI** — a Next.js chat-first workspace (light + dark),
  semantic search, sync status, conversation history, and a clear separation
  between "Project memory" and cited "Sources".

## Architecture

```
                ┌───────────────────┐
                │      apps/web     │  Next.js 16 · Tailwind v4 · TanStack Query
                └─────────┬─────────┘
                          │ REST
                ┌─────────▼─────────┐
                │      apps/api     │  Express 5 (Route → Service → Repository)
                └──┬─────┬─────┬────┘
        sync/search│     │agent│conversations + memory
        ┌──────────▼─┐ ┌─▼───────────▼──────────┐
        │ GitHub     │ │ LangGraph agent         │
        │ integration│ │ guardrail → memory →    │
        └──────┬─────┘ │ decompose → retrieve →  │
               │       │ evaluate → refine →     │
        ┌──────▼─────┐ │ context → generate →    │
        │ BullMQ /   │ │ output guardrail        │
        │ Redis      │ └──────────┬──────────────┘
        └────────────┘            │
               │       ┌──────────▼──────────────┐
               │       │ LLM (OpenCode Go) +      │
               │       │ Gemini embeddings        │
               │       └──────────┬──────────────┘
        ┌──────▼──────────────────▼──────┐
        │  PostgreSQL + pgvector (Prisma)│
        └────────────────────────────────┘
                    traces ↓
                ┌────────────────┐
                │    LangSmith   │
                └────────────────┘
```

The agent graph lives in `apps/api/src/agent/` (nodes, state, guardrails,
JSON-tolerant LLM helpers). Reusable AI building blocks — LLM provider
abstraction, embeddings, chunking, evaluation framework, LangSmith client —
live in `packages/ai`.

## Monorepo structure

```
apps/
  api/        Express 5 backend: routes → services → repositories,
              GitHub integration, BullMQ workers, LangGraph agent,
              retrieval, indexing, evaluation runner
  web/        Next.js 16 frontend: dashboard, project chat + search

packages/
  ai/         LLM providers (OpenCode Go), Gemini embeddings, chunker,
              evaluation framework (dataset/runner/evaluator), LangSmith
              client, LLM JSON-tolerant parsing utilities
  database/   Prisma schema + client singleton + migrations (pgvector via
              raw SQL where Prisma can't express it)
  types/      Shared Zod schemas + types (NormalizedDocument, health, enums)
  config/     Shared constants + .env loader
  eslint-config/  Shared flat ESLint config
```

**Layering rules:** routes never call external APIs or Prisma directly;
external data is normalized before persistence; Prisma stays behind
repository boundaries; raw SQL is used only where Prisma cannot express the
query (pgvector similarity, metadata JSON filtering).

## How it works

1. **Sync** — `POST /projects/:id/sync` creates a `SyncJob` (PENDING) and
   enqueues a BullMQ job. The worker fetches issues/PRs/commits from GitHub
   in parallel, maps each to a `NormalizedDocument`, and upserts idempotently
   (`@@unique([sourceType, sourceId, documentType])`). On completion it
   chains an `embedding-index` job.
2. **Index** — documents are chunked and embedded (Gemini, task-type aware,
   L2-normalized, 429 rate-limit retry) into `DocumentChunk.embedding
   vector(768)`.
3. **Ask** — a question goes through the agent graph:

```
input guardrail → memory retrieval → decompose → retrieve → evaluate
     evaluate --(insufficient, iteration < 2)--> refine → retrieve
     evaluate --(otherwise)--> build context → generate → output guardrail
```

- **Decompose** turns the question into 1–5 retrieval plans, each with a
  strategy (`semantic` / `activity` / `hybrid`) and optional temporal
  constraints (`occurredAt` vs `mergedAt`, relative ranges, exhaustive).
- **Retrieve** executes plans in parallel: pgvector cosine KNN for semantic,
  date-filtered SQL for activity, both for hybrid; chunks are deduplicated
  and capped.
- **Evaluate** asks an LLM (with retrieval scope metadata) whether the
  evidence is sufficient and what's missing.
- **Refine** converts missing evidence into targeted replacement plans and
  loops back to retrieval (max 2 iterations).
- **Generate** produces the answer with `[Source N]` citations from numbered
  evidence; project memories are provided as context but are never citable.
- **Output guardrail** validates citations against retrieved chunks and
  forces honest "could not verify" answers when evidence is insufficient.

## Retrieval system

| Strategy | Implementation | Notes |
|---|---|---|
| Semantic | `1 - (embedding <=> $vec)` cosine KNN, topK×3 candidates, per-document dedup | raw SQL, `apps/api/src/retrieval/retrieval.repository.ts` |
| Activity | `occurredAt` / PR `mergedAt` range filters over documents, relative-range resolution | `retrieval/temporal.ts`, `activity.repository.ts` |
| Hybrid | both branches per plan, dedup across plans | `agent/nodes/retrieve.ts` |
| Memory | cosine similarity ≥ 0.7, topK 5 | `modules/memory/memory.repository.ts` |

## Project memory

After each exchange, an extraction prompt distills durable
facts/decisions/preferences from the conversation (strict schema, tolerant
JSON parsing). Memories are embedded and deduplicated against existing
memories of the same type at ≥ 0.9 cosine similarity. At query time relevant
memories (≥ 0.7) are retrieved before decomposition and labeled as
**memory — not evidence**: the generation prompt forbids citing them, and the
UI renders them in a separate "Project memory" block with an explicit
"not a retrieved source" disclaimer.

## Guardrails

- **Input:** empty/oversized queries rejected (4 000-char limit, enforced at
  the route and in the graph).
- **Output:** empty answers, invalid `[Source N]` references, and confident
  answers without sufficient evidence are caught. Instead of failing the
  request, a non-conforming answer is replaced by an honest
  "could not verify" fallback.
- **Context bounds:** retrieval is capped at 50 unique chunks so the
  refinement loop cannot blow up the generation prompt.
- **JSON tolerance:** every LLM structured call (decompose, evaluate,
  refine, memory extraction, evaluator) parses through a balanced-brace,
  code-fence-tolerant extractor with a stricter retry.

## Evaluation

`pnpm evaluate` runs a 6-case dataset against a real indexed project
(configured with `EVALUATION_PROJECT_ID`):

| Case | Measures |
|---|---|
| repository technical question | grounded technical explanation with citations |
| repository implementation question | summarizing changes across sources |
| recent activity | temporal retrieval + citation |
| unsupported question | refusal without fabrication |
| project memory | memory recall without fabricated evidence |
| memory + evidence | separating memory from repository verification |

Each answer is scored 0–1 by an LLM-as-judge against the expected behaviour;
scores are attached to the real LangSmith run of each case as
`correctness` feedback, and the run prints a summary (`X/6 cases >= 0.75`).

**Current results** (run against the seeded `facebook/react` project,
September 2026): **6/6 cases scored ≥ 0.75 — all six scored 1.00**, with
`correctness` feedback attached to each case's LangSmith run. Notably, the
unsupported-question case refused to speculate and the memory+evidence case
correctly separated the Redis decision (memory) from its unverified
implementation status (repository evidence). Run it yourself with
`pnpm evaluate`.

## LangSmith observability

Tracing is wired through `packages/ai/src/observability`
(`configureTracingFromEnv()` at startup) and is **off by default**. With
`LANGSMITH_TRACING=true` + `LANGSMITH_API_KEY`, every agent run appears in
LangSmith: the question, decomposition plans, each retrieval call, the
evaluation verdict, refinement decisions, and the generated answer. The
evaluation runner additionally captures the root run id of each case and
attaches `correctness` feedback to the exact run, so rubric scores can be
reviewed next to the traces that produced them. This makes failures debuggable
end to end: you can see whether a bad answer came from retrieval (nothing
relevant found), evaluation (evidence misjudged), refinement (wrong follow-up
plans) or generation (ignored the evidence).

## Tech stack

| Layer | Tools |
|---|---|
| Monorepo | Turborepo, pnpm workspaces, TypeScript (strict) |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, TanStack Query, react-markdown |
| Backend | Express 5, Zod, Prisma 6, PostgreSQL 16 + pgvector |
| AI | LangGraph, LangChain, LangSmith, OpenCode Go (LLM), Gemini embeddings |
| Jobs | Redis 7, BullMQ |
| Dev / infra | Docker Compose, ESLint 9 (flat), Prettier, Vitest, tsx |

## Local development

```bash
git clone <repo-url> && cd project-intelligence-agent
pnpm install
cp .env.example .env          # fill in the keys below
docker compose up -d          # PostgreSQL (pgvector) + Redis
pnpm db:migrate:deploy        # apply migrations (includes pgvector setup)
pnpm db:seed                  # seed a dev workspace + facebook/react project
pnpm dev                      # API on :4000, web on :3000
```

Required environment values: `OPENCODE_API_KEY`, `GEMINI_API_KEY`,
`GITHUB_TOKEN` (a classic PAT with repo read access is enough), plus the
defaults for `DATABASE_URL` / `REDIS_URL`. Optional: `LANGSMITH_TRACING`,
`LANGSMITH_API_KEY`, `EVALUATION_PROJECT_ID`.

First use: open `http://localhost:3000`, open the **React** project and press
**Sync now** — the sync runs through BullMQ, then chunking + embedding run
automatically, and chat/search become available.

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` / `dev:api` / `dev:web` | Run everything or one app |
| `pnpm build` / `lint` / `typecheck` / `test` | Quality gates (Turborepo) |
| `pnpm evaluate` | Run the agent evaluation dataset (needs `EVALUATION_PROJECT_ID`) |
| `pnpm db:generate` / `db:migrate` / `db:migrate:deploy` / `db:studio` | Prisma |
| `pnpm infra:up` / `infra:down` / `infra:logs` | Docker Compose |

## Testing

35 automated tests (Vitest) cover the agent graph, decomposition, retrieval
planning, refinement, guardrails, memory retrieval/extraction/deduplication
and the memory service. Type-level verification is strict across the
monorepo. `pnpm test && pnpm typecheck && pnpm build && pnpm lint` are the
release gates.

## Security posture

Honest limitations, by design for a portfolio/dev product: there is **no
authentication** (the API is protected only by CORS and validation, so do
not expose it publicly), GitHub tokens are a single dev `GITHUB_TOKEN`, and
`Connection.credentials` is stored in plaintext. Input is Zod-validated with
length caps, JSON bodies are limited to 1 MB, markdown is rendered without
raw HTML, and internal errors never reach clients (sanitized messages, logs
server-side). Multi-user auth and per-workspace credential encryption are the
top items in Future Improvements.

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for a production topology
(Postgres+pgvector, Redis, API+worker, web) and the environment matrix.

## Future improvements

- Authentication + per-user workspaces; encrypted per-connection credentials
- Jira integration (the normalized-document abstraction is provider-ready)
- Streaming answers (SSE) for chat responses
- ANN index (ivfflat/HNSW) on the embedding columns for larger corpora
- GitHub App auth + webhooks for incremental sync (the SyncJob cursor field
  is already in place)
- MCP tool interface for external agent clients

## Lessons learned

- **Normalize before you persist.** One `NormalizedDocument` shape keeps
  retrieval, agents and the UI independent of GitHub's API schema.
- **Evidence evaluation is the difference** between a demo and a system:
  scoring evidence sufficiency and refining retrieval costs a couple of LLM
  calls but turns confident hallucinations into honest "I couldn't verify".
- **Tolerant LLM-JSON parsing** (fences, prose, retries) removed an entire
  class of random 500s from structured outputs.
- **Guardrails should degrade, not crash** — replacing a bad answer with a
  safe refusal beats returning a 500 after 60 seconds of retrieval.
- Observability pays for itself the first time you debug a retrieval loop.
