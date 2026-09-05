# Project Intelligence Agent (PIA) — AI Build Handoff Document

> **Purpose:** Paste this document into an AI chat to continue building PIA.
> It contains the complete current state (verified against the codebase as of
> 2026-09-05), the important existing code, architecture, conventions, and a
> concrete build plan for everything that is still missing.
>
> Related docs: `PIA-CURRECT-STATE.md` (older, phases 1–2 era — partially
> outdated), `PIA-STATUS-REPORT.md` (audit summary), `README.md`.

---

# 1. WHAT PIA IS

PIA is an **agentic RAG platform for software/project intelligence**. It
connects to live project data (GitHub today, Jira later), builds a normalized,
chunked, embedded knowledge base in PostgreSQL+pgvector, and runs a LangGraph
agent that answers project questions with evidence-backed answers containing
`[Source N]` citations.

The pipeline that exists and works today:

```text
GitHub API → Client → Service → Mappers → NormalizedDocument[]
    → BullMQ github-sync worker → Prisma upsert → PostgreSQL (Document)
    → BullMQ embedding-index worker → chunk (packages/ai) → DocumentChunk rows
    → Gemini embeddings → pgvector vector(768) column
    → LangGraph agent (decompose → retrieve → evaluate → refine → context → generate)
    → cited answer
```

## Development philosophy

Build **one layer at a time**, keep the underlying data layer reliable, and do
not ship fake integrations. The roadmap order: foundation → data layer →
background jobs → chunking/embeddings → retrieval → RAG agent → **(you are
here)** → web UI / Jira / memory / MCP / auth / production hardening.

---

# 2. TECH STACK

| Layer | Tools |
|---|---|
| Monorepo | Turborepo 2.x, pnpm 10 workspaces, TypeScript 5.8 (strict) |
| Frontend | Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, Radix, TanStack Query 5, Zod 4 |
| Backend | Express 5, Zod, Prisma 6.19, PostgreSQL 16 + pgvector |
| AI | LangChain Core 1.x, @langchain/langgraph 1.x, @langchain/openai, langsmith 0.9, @google/genai |
| Jobs | Redis 7, BullMQ 5, ioredis |
| Dev | Docker Compose, ESLint 9 (flat), Prettier 3 |

Node 20+ (tested on 24). **No test framework is configured** — verification is
via `pnpm typecheck`, `pnpm lint`, dev routes, and `apps/api/src/dev/*` scripts.

---

# 3. MONOREPO STRUCTURE (actual files, node_modules omitted)

```text
pia/
├── package.json                  # root turbo scripts (dev, build, lint, typecheck, db:*, infra:*)
├── turbo.json  pnpm-workspace.yaml  tsconfig.base.json  prettier.config.mjs
├── docker-compose.yml            # postgres (pgvector/pgvector:pg16, port 5432) + redis (redis:7-alpine, 6379)
├── docker/postgres/init.sql      # CREATE EXTENSION IF NOT EXISTS vector;
├── .env.example                  # canonical env var list
│
├── apps/
│   ├── api/                      # Express backend (port 4000)
│   │   └── src/
│   │       ├── server.ts                     # app + worker startup + graceful shutdown
│   │       ├── app.ts                        # express app, routes, error handling
│   │       ├── config/env.ts                 # Zod env schema (source of truth for env)
│   │       ├── lib/redis.ts                  # lazy ioredis singleton
│   │       ├── middleware/errorHandler.ts    # AppError, notFound, errorHandler
│   │       ├── modules/
│   │       │   ├── health/health.routes.ts   # GET /health, /health/redis, /health/db
│   │       │   └── dev/
│   │       │       ├── dev.routes.ts         # POST /dev/jobs/system (BullMQ smoke test)
│   │       │       └── github.routes.ts      # sync / index / search / agent dev routes
│   │       ├── integrations/
│   │       │   ├── index.ts
│   │       │   └── github/                   # github.{client,types,mapper,service,repository,config,factory}.ts, index.ts, github.test.ts
│   │       ├── workers/
│   │       │   ├── queues.ts                 # github-sync, embedding-index, system queues
│   │       │   ├── workers.ts                # githubSyncWorker, embeddingIndexWorker, systemWorker
│   │       │   └── jobs/types.ts             # GithubSyncJob, EmbeddingIndexJob, SystemPingJob
│   │       ├── indexing/
│   │       │   ├── document-indexer.ts       # indexDocumentChunks(), chunkProjectDocuments()
│   │       │   ├── document-chunk.repository.ts
│   │       │   ├── embedding-indexer.ts      # embedDocumentChunks() batch loop
│   │       │   ├── embedding.repository.ts   # raw SQL UPDATE embedding = $1::vector
│   │       │   └── embedding-provider.ts     # createEmbeddingProvider() from env
│   │       ├── retrieval/
│   │       │   ├── retriever.ts              # VectorRetriever (3x overfetch, per-doc dedup, topK 5)
│   │       │   ├── retrieval.repository.ts   # pgvector cosine KNN raw SQL
│   │       │   ├── activity.repository.ts    # temporal activity search raw SQL
│   │       │   ├── activity.types.ts
│   │       │   ├── temporal.ts               # resolveTemporalRange() UTC
│   │       │   └── types.ts
│   │       ├── agent/
│   │       │   ├── state.ts                  # AgentState, RetrievalPlan, ActivityConstraints
│   │       │   ├── graph.ts                  # StateGraph: decompose→retrieve→evaluate→(refine loop)→context→generate
│   │       │   └── nodes/{decompose,retrieve,retrieve-activity,evaluate,refine,context,generate}.ts
│   │       ├── mcp/index.ts                  # EMPTY placeholder (export {})
│   │       └── dev/                          # one-off scripts: reindex-project.ts, graph-test.ts, llm-test.ts, etc.
│   │
│   └── web/                      # Next.js frontend (port 3000) — SKELETON ONLY
│       └── src/
│           ├── app/{layout.tsx,page.tsx,providers.tsx,globals.css}
│           ├── components/health-card.tsx
│           ├── components/ui/{button,card,badge,input}.tsx   # stock shadcn
│           └── lib/{api.ts,utils.ts}          # api.ts only has fetchHealth()
│
├── packages/
│   ├── ai/                       # @project-intelligence/ai — shared AI abstractions
│   │   └── src/
│   │       ├── index.ts                      # barrel: providers, langgraph, observability, indexing, embeddings, retrieval
│   │       ├── providers/llm/{types.ts,index.ts,opencode.ts}
│   │       ├── embeddings/{types.ts,gemini.ts}
│   │       ├── indexing/{chunker.ts,indexer.ts}
│   │       ├── retrieval/types.ts            # RetrievedChunk (shared contract)
│   │       ├── observability/index.ts        # LangSmith config + configureTracingFromEnv()
│   │       └── langgraph/                    # ⚠ STALE: state.ts (dup of agent/state.ts), graph.ts (throwing placeholder), nodes (empty)
│   ├── database/                 # @project-intelligence/database — Prisma schema + client singleton
│   │   └── prisma/schema.prisma, migrations/, seed.ts
│   ├── types/                    # @project-intelligence/types — Zod schemas + NormalizedDocument, SyncResult
│   ├── config/                   # @project-intelligence/config — SERVICE_NAME, loadEnv() (walks to root .env)
│   └── eslint-config/            # shared flat ESLint config
```

## Root scripts

```bash
pnpm dev                # web + api via turbo
pnpm dev:web / dev:api  # single app
pnpm build | lint | typecheck | format
pnpm db:generate | db:migrate | db:migrate:deploy | db:push | db:studio | db:seed
pnpm infra:up | infra:down | infra:down:clean | infra:logs   # docker compose
```

Local creds: `postgresql://pia:pia@localhost:5432/pia`, `redis://localhost:6379`.

---

# 4. ENVIRONMENT (`apps/api/src/config/env.ts` — full file)

```typescript
import { loadEnv } from "@project-intelligence/config";
import { z } from "zod";

loadEnv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1).default("postgresql://pia:pia@localhost:5432/pia"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  LLM_PROVIDER: z.enum(["opencode"]).default("opencode"),
  LLM_MODEL: z.string().default("deepseek-v4-flash"),
  OPENCODE_API_KEY: z.string().min(1),

  LANGSMITH_TRACING: z.enum(["true", "false"]).default("false"),
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().default("project-intelligence-agent"),
  LANGSMITH_ENDPOINT: z.string().optional(),

  GITHUB_TOKEN: z.string().min(1),        // dev-only global token (temporary)

  GEMINI_API_KEY: z.string().min(1),
  EMBEDDING_PROVIDER: z.enum(["gemini"]).default("gemini"),
  EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. See logs above.");
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
```

LangSmith is wired at startup in `server.ts` via
`configureTracingFromEnv()` from `@project-intelligence/ai`, which aliases
`LANGSMITH_*` → `LANGCHAIN_*` env vars so LangChain auto-instrumentation picks
them up. Enable with `LANGSMITH_TRACING=true` + `LANGSMITH_API_KEY`.

**When you add a feature that needs env vars:** extend `EnvSchema`, add to
`.env.example`, never log secrets.

---

# 5. DATABASE SCHEMA (`packages/database/prisma/schema.prisma`)

```prisma
enum ConnectionProvider { GITHUB  JIRA }
enum ConnectionStatus   { ACTIVE  INACTIVE  ERROR }
enum DocumentSourceType { GITHUB  JIRA }
enum DocumentType       { ISSUE  PULL_REQUEST  COMMIT  FILE  PAGE }
enum SyncStatus         { PENDING  RUNNING  COMPLETED  FAILED }

model HealthCheck { id String @id @default(cuid()); status String @default("ok"); createdAt DateTime @default(now()) }

model Workspace {
  id      String @id @default(cuid())
  name    String
  connections Connection[]
  projects    Project[]
  documents   Document[]
  syncJobs    SyncJob[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Connection {
  id          String @id @default(cuid())
  workspaceId String
  provider    ConnectionProvider
  externalId  String
  credentials String?                       // ⚠ PLAINTEXT — encryption NOT implemented
  status      ConnectionStatus @default(ACTIVE)
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  projects Project[]
  syncJobs  SyncJob[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([workspaceId, provider, externalId])
  @@index([workspaceId])
}

model Project {
  id           String @id @default(cuid())
  workspaceId  String
  connectionId String
  name         String
  externalId   String          // convention for GitHub: "owner/repo" e.g. "facebook/react"
  sourceType   DocumentSourceType
  sourceUrl    String?
  workspace  Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  connection Connection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  documents Document[]
  syncJobs   SyncJob[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([connectionId, externalId])
  @@index([workspaceId])
}

model Document {
  id           String @id @default(cuid())
  workspaceId  String
  projectId    String
  sourceType   DocumentSourceType
  sourceId     String
  documentType DocumentType
  title        String
  content      String
  url          String?
  author       String?
  occurredAt   DateTime?
  metadata     Json?          // e.g. { number, state, updatedAt, mergedAt }
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  chunks DocumentChunk[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([sourceType, sourceId, documentType])   // makes sync idempotent (upsert key)
  @@index([workspaceId]) @@index([projectId]) @@index([sourceType]) @@index([occurredAt])
}

model DocumentChunk {
  id          String @id @default(cuid())
  documentId  String
  content     String
  chunkIndex  Int
  embedding   Unsupported("vector(768)")?   // pgvector; NULL until embedded
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([documentId, chunkIndex])
  @@index([documentId])
}

model SyncJob {
  id           String @id @default(cuid())
  workspaceId  String
  connectionId String
  projectId    String?
  provider     ConnectionProvider
  status       SyncStatus @default(PENDING)
  startedAt    DateTime?
  completedAt  DateTime?
  recordsProcessed Int @default(0)
  error        String?
  cursor       String?        // unused so far (reserved for pagination)
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  connection Connection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([workspaceId]) @@index([connectionId]) @@index([projectId]) @@index([status])
}
```

No User/auth models exist. Dev seed (`prisma/seed.ts`, upsert-based) creates:
workspace `pia-dev-workspace` → GITHUB connection `github-development` →
project `React` (`facebook/react`, id `cmtgx0qbc0003lrh8t604v78b`).

**pgvector note:** no ANN index (ivfflat/hnsw) on `embedding` yet — KNN is a
sequential scan, fine at dev scale. Add one when scaling (see §9 backlog).

---

# 6. SHARED TYPES (`packages/types/src/index.ts` — key exports)

```typescript
healthResponseSchema / HealthResponse           // { status, service, timestamp } — keep timestamp!
apiErrorResponseSchema / ApiErrorResponse       // { error, message }
Paginated<T>                                    // { data, page, pageSize, total, totalPages }
connectionProviderSchema = z.enum(["GITHUB", "JIRA"])
connectionStatusSchema   = z.enum(["ACTIVE", "INACTIVE", "ERROR"])
documentSourceTypeSchema = z.enum(["GITHUB", "JIRA"])
documentTypeSchema       = z.enum(["ISSUE", "PULL_REQUEST", "COMMIT", "FILE", "PAGE"])
syncStatusSchema         = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"])

export interface NormalizedDocument {
  sourceType: "GITHUB" | "JIRA";
  sourceId: string;
  documentType: "ISSUE" | "PULL_REQUEST" | "COMMIT" | "FILE" | "PAGE";
  title: string;
  content: string;
  url?: string;
  author?: string;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SyncResult {
  recordsProcessed: number;
  documentsCreated: number;
  documentsUpdated: number;
}
```

---

# 7. EXISTING IMPLEMENTATION — KEY CODE

## 7.1 packages/ai — LLM provider abstraction

`providers/llm/types.ts`:

```typescript
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type LLM = BaseChatModel;

export interface LLMProviderConfig {
  provider: string;
  model: string;
  options?: { apiKey?: string };
}

export interface LLMProvider {
  readonly name: string;
  createModel(config: LLMProviderConfig): LLM;
}
```

`providers/llm/opencode.ts` (real adapter):

```typescript
import { ChatOpenAI } from "@langchain/openai";

const OPENCODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1";

export class OpenCodeGoProvider implements LLMProvider {
  readonly name = "opencode";

  createModel(config: LLMProviderConfig): LLM {
    if (!config.model.trim()) throw new Error("LLM model cannot be empty.");
    const apiKey = config.options?.apiKey;
    if (typeof apiKey !== "string" || !apiKey.trim())
      throw new Error("OpenCode Go API key is required in the LLM provider configuration.");

    return new ChatOpenAI({
      model: config.model,
      apiKey,
      configuration: { baseURL: OPENCODE_GO_BASE_URL },
    });
  }
}
```

`providers/llm/index.ts` has `PROVIDER_REGISTRY` (`{ opencode: ... }`),
`getProvider(name)`, and:

```typescript
export function createLLMFromEnv(provider: string, model: string, apiKey: string) {
  const config: LLMProviderConfig = { provider, model, options: { apiKey } };
  return getProvider(provider).createModel(config);
}
```

Usage everywhere: `const llm = createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY);`

## 7.2 packages/ai — embeddings (Gemini)

`embeddings/types.ts` interface (contract to honor in new providers):

```typescript
export interface EmbeddingProvider {
  readonly name: string;
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  embedDocuments(texts: string[]): Promise<number[][]>;
}
```

`embeddings/gemini.ts` implements it with `@google/genai`:
- `taskType: "RETRIEVAL_DOCUMENT"` for docs, `"RETRIEVAL_QUERY"` for queries
- `outputDimensionality: dimensions` (768)
- **L2-normalizes** all vectors (matches cosine `<=>` distance usage)
- retries 429s with server-provided `RetryInfo` delay + exponential backoff (max 3 retries, 120s cap)

`apps/api/src/indexing/embedding-provider.ts`:

```typescript
export function createEmbeddingProvider(): EmbeddingProvider {
  return new GeminiEmbeddingProvider({
    apiKey: env.GEMINI_API_KEY,
    model: env.EMBEDDING_MODEL,
    dimensions: env.EMBEDDING_DIMENSIONS,
  });
}
```

## 7.3 packages/ai — chunking

- `chunker.ts`: `chunkText(text, { chunkSize = 1000, chunkOverlap = 200 })` → `Chunk[] { content, chunkIndex }`. Splits on paragraphs → sentences → hard slices.
- `indexer.ts`: `indexDocument(document: NormalizedDocument, options?)` → `IndexedChunk[] { sourceType, sourceId, documentType, chunkIndex, content }`. Composes content as `title\n\ncontent`.

## 7.4 packages/ai — observability / LangSmith

`observability/index.ts` exports: `getLangSmithConfig()`, `isLangSmithEnabled()`,
`createLangSmithClient(): Client | null` (direct SDK use), and the startup hook:

```typescript
export function configureTracingFromEnv(): boolean {
  const config = getLangSmithConfig();
  if (!config.tracingEnabled) return false;

  if (process.env.LANGCHAIN_TRACING_V2 === undefined)
    process.env.LANGCHAIN_TRACING_V2 = "true";
  if (config.apiKey && process.env.LANGCHAIN_API_KEY === undefined)
    process.env.LANGCHAIN_API_KEY = config.apiKey;
  if (config.project && process.env.LANGCHAIN_PROJECT === undefined)
    process.env.LANGCHAIN_PROJECT = config.project;
  if (config.endpoint && process.env.LANGCHAIN_ENDPOINT === undefined)
    process.env.LANGCHAIN_ENDPOINT = config.endpoint;

  return true;
}
```

Called once in `apps/api/src/server.ts` before serving; logs
`🔍 LangSmith tracing enabled (project: ...)` when active.

## 7.5 GitHub integration (`apps/api/src/integrations/github/`)

- **github.client.ts** — `GithubClient` class; REST calls to `https://api.github.com` with `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`; methods `getRepository(owner, repo)`, `getIssues`, `getPullRequests`, `getCommits` (`per_page=100`). Types in `github.types.ts` (note: commit message lives at `commit.commit.message`).
- **github.mapper.ts** — `mapIssueToDocument`, `mapPullRequestToDocument`, `mapCommitToDocument` → `NormalizedDocument`. Issue/PR: `sourceId = String(id)`, `occurredAt = created_at`, metadata `{ number, state, updatedAt[, mergedAt] }`. Commit: `sourceId = sha`, title = first line of message, metadata `{ sha, authorEmail }`. PRs appearing in `/issues` responses are skipped by the service (`issue.pull_request` check).
- **github.repository.ts** — `saveGithubDocuments({ workspaceId, projectId, documents })` upserts by `@@unique([sourceType, sourceId, documentType])`, counts created/updated. **Prisma stays behind this boundary.**
- **github.service.ts** — `GithubService.syncRepository({ owner, repository, workspaceId, projectId })`: fetches issues+PRs+commits in `Promise.all`, maps, persists, returns `{ documents, created, updated }`.
- **github.factory.ts / github.config.ts** — `createGithubClient()` from `env.GITHUB_TOKEN` (global dev token; production plan = per-Connection encrypted credentials).

## 7.6 BullMQ queues & workers (`apps/api/src/workers/`)

`jobs/types.ts`:

```typescript
export interface SystemPingJob { ts: number }
export interface GithubSyncJob { projectId: string; syncJobId: string }
export interface EmbeddingIndexJob { projectId: string }
```

`queues.ts`: `redisConnection()` (parses `REDIS_URL`, `maxRetriesPerRequest: null`);
`getGithubSyncQueue()`, `getEmbeddingIndexQueue()`, `getSystemQueue()`;
`enqueueGithubSyncJob(projectId, syncJobId)` (adds `github.sync`);
`enqueueEmbeddingIndexJob(projectId)` (adds `embedding.index` with
`attempts: 5, backoff: exponential 30s, removeOnComplete: true, removeOnFail: false`).

`workers.ts` (all started in `server.ts` only when `NODE_ENV !== "production"`):
- **githubSyncWorker** (`github-sync`): validates job name `github.sync`; loads
  SyncJob; guards project match, provider GITHUB, status PENDING; transitions
  PENDING→RUNNING (sets startedAt); runs `GithubService.syncRepository`; on
  success marks COMPLETED with `recordsProcessed = result.documents.length` and
  **chains `enqueueEmbeddingIndexJob(projectId)`**; on failure marks FAILED with
  error message and rethrows (BullMQ retries).
- **embeddingIndexWorker** (`embedding-index`): `chunkProjectDocuments(projectId)`
  (chunks only documents with `chunks: { none: {} }` so existing embeddings
  aren't wiped) → `createEmbeddingProvider()` → `embedDocumentChunks(provider, projectId)`.
- **systemWorker** (`system`): dev-only log stub.

`embedding-indexer.ts` loops in batches of 50: selects `DocumentChunk` rows with
`embedding IS NULL` joined to the project, calls `provider.embedDocuments`, and
`embedding.repository.ts` persists via raw SQL
`UPDATE "DocumentChunk" SET "embedding" = $1::vector WHERE id = $2`.

## 7.7 Retrieval (`apps/api/src/retrieval/`)

Shared chunk contract (`packages/ai/src/retrieval/types.ts`):

```typescript
export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  title: string;
  url?: string;
  similarity: number;
  activityAt?: Date;
  activityDateField?: string;
}
```

pgvector KNN (`retrieval.repository.ts`) — the core SQL:

```typescript
const rows = await prisma.$queryRaw<RetrievedChunkRow[]>`
  SELECT dc."id", dc."documentId", dc."content", dc."chunkIndex",
         d."title", d."url",
         1 - (dc."embedding" <=> ${vector}::vector) AS "similarity"
  FROM "DocumentChunk" dc
  INNER JOIN "Document" d ON d."id" = dc."documentId"
  WHERE dc."embedding" IS NOT NULL AND d."projectId" = ${projectId}
  ORDER BY dc."embedding" <=> ${vector}::vector
  LIMIT ${topK}
`;
```

(`vectorLiteral(values)` builds `[0.1,0.2,...]` from the query embedding.)

`VectorRetriever` (`retriever.ts`): `retrieve(query, { projectId, topK = 5 })` →
embed query → KNN with `topK * 3` candidates → dedupe by `documentId` → topK.

Activity retrieval (`activity.repository.ts`): `searchProjectActivity({ projectId, from, to, dateField, exhaustive, limit = 50, documentTypes })` —
raw SQL over `Document` filtered by `occurredAt` range (or `metadata->>'mergedAt'::timestamptz` for merged PRs, `documentType = 'PULL_REQUEST'`), optional
`documentType IN (...)` filter, `ORDER BY ... DESC`, `LIMIT` omitted when
`exhaustive` is true. Returns `ProjectActivity` rows.

`temporal.ts`: `resolveTemporalRange(range: TemporalRange)` converts
`today | yesterday | this_week | last_week | this_month | last_month |
this_quarter | last_quarter | this_year | last_year` → `{ from: Date, to: Date }`
in UTC. `custom` throws (must pass explicit dates).

## 7.8 LangGraph agent (`apps/api/src/agent/`)

`state.ts` (the agent contract — full):

```typescript
import type { RetrievedChunk } from "../retrieval/types";

export type RetrievalStrategy = "semantic" | "activity" | "hybrid";
export type ActivityDateField = "occurredAt" | "mergedAt";
export type TemporalRange = "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "this_quarter" | "last_quarter"
  | "this_year" | "last_year" | "custom";

export interface ActivityConstraints {
  dateField?: ActivityDateField;
  temporalRange?: TemporalRange;
  occurredAt?: { gte: string; lte: string };
  mergedAt?: { gte: string; lte: string };
  exhaustive?: boolean;
}

export interface RetrievalPlan {
  question: string;
  strategy: RetrievalStrategy;
  activityConstraints?: ActivityConstraints;
  semanticQuery?: string;
}

export interface RetrievedEvidence {
  subQuestion: string;
  chunks: RetrievedChunk[];
}

export interface AgentState {
  projectId: string;
  query: string;
  subQuestions: RetrievalPlan[];
  retrievedChunks: RetrievedChunk[];
  evidence: RetrievedEvidence[];
  evidenceSufficient: boolean;
  missingEvidence: string[];
  retrievalIteration: number;
  context: string;
  answer: string;
}
```

`graph.ts` — graph shape (compile result exported as `agentGraph`):

```typescript
const graph = new StateGraph(AgentStateAnnotation)
  .addNode("decompose", decomposeNode)
  .addNode("retrieve", retrieveNode)
  .addNode("evaluate", evaluateNode)
  .addNode("refine", refineNode)
  .addNode("buildContext", buildContextNode)
  .addNode("generate", generateNode)
  .addEdge(START, "decompose")
  .addEdge("decompose", "retrieve")
  .addEdge("retrieve", "evaluate")
  .addConditionalEdges("evaluate", routeAfterEvaluation, { refine: "refine", buildContext: "buildContext" })
  .addEdge("refine", "retrieve")
  .addEdge("buildContext", "generate")
  .addEdge("generate", END);

export const agentGraph = graph.compile();
// MAX_RETRIEVAL_ITERATIONS = 2 in routeAfterEvaluation
```

Node responsibilities:
- **decompose** — LLM prompt returns strict JSON: 1–5 plans
  `{ question, strategy: "semantic"|"activity"|"hybrid", activity_constraints?, semantic_query? }`.
  Defensive `parsePlans()` validates/tolerates key aliases (`task`,
  `retrieval_strategy`, `plans`, `retrieval_plans`). Relative dates are NOT
  computed by the LLM — it emits `temporalRange` tokens; code resolves them.
- **retrieve** — for each plan: semantic → `VectorRetriever.retrieve` (topK 5);
  activity → `resolveTemporalRange` or explicit gte/lte →
  `retrieveActivity`; hybrid → both. Activities are adapted into
  `RetrievedChunk` shape (temporary adapter, `similarity: 1`). Results deduped
  by chunk id; sets `retrievedChunks` + `evidence`.
- **evaluate** — LLM judges evidence sufficiency; sets `evidenceSufficient`,
  `missingEvidence[]`; `refine` rewrites queries for another retrieval round.
- **buildContext** — formats chunks (numbered sources) into `context`.
- **generate** — big grounded-answer prompt; rules: only context facts, cite
  `[Source N]`, don't mention similarity scores, respect retrieval scope
  (authoritative temporal range / exhaustivity), distinguish "INSUFFICIENT
  evidence" from "no matching activity". Returns `{ answer }`.

Every LLM node calls `createLLMFromEnv(env.LLM_PROVIDER, env.LLM_MODEL, env.OPENCODE_API_KEY)` then `await llm.invoke(prompt)`.

## 7.9 API routes (`apps/api/src/modules/`)

Health: `GET /health`, `/health/redis`, `/health/db`.

Dev routes (`modules/dev/github.routes.ts`):

| Method | Path | What it does |
|---|---|---|
| POST | `/dev/github/sync/:projectId` | Creates SyncJob (PENDING), 409 if one is PENDING/RUNNING, enqueues `github.sync`, returns 202 `{ syncJob, queueJobId }` |
| GET | `/dev/github/sync/:projectId/status` | Latest SyncJob status |
| POST | `/dev/github/index/:projectId` | Verifies chunks exist (404 if none), enqueues `embedding.index`, returns 202 |
| GET | `/dev/github/search/:projectId?q=` | `VectorRetriever.retrieve(q, { projectId, topK: 5 })` → results JSON |
| GET | `/dev/github/agent/:projectId?q=` | `agentGraph.invoke({ projectId, query })` → `{ answer, sources: [{ title, url, similarity }] }` |

(The dev `/github/index/:projectId` route 404s when no chunks exist yet — with
the new auto-chaining this is mostly moot; chunking now happens in the worker.)

Also `POST /dev/jobs/system` (BullMQ smoke test), `apps/api/src/mcp/index.ts`
is an empty placeholder.

Error handling (`middleware/errorHandler.ts`): `AppError`, `notFound`,
Zod-aware `errorHandler`. Routes follow the pattern
`router.post(..., async (req, res, next) => { try { ... } catch (e) { next(e); } })`.

## 7.10 Frontend (`apps/web`) — skeleton

- `app/providers.tsx` — TanStack Query provider (+ devtools)
- `lib/api.ts` — only `fetchHealth()` using `NEXT_PUBLIC_API_URL`
- `components/health-card.tsx` — only real component
- shadcn primitives in `components/ui/`: button, card, badge, input

## 7.11 Verified working (from real dev runs)

- Full sync of `facebook/react` (240+ docs) persisted idempotently (2nd run:
  0 created / all updated)
- Chunking + Gemini embedding + pgvector search working end-to-end
- Agent answers with `[Source N]` citations on dev route
- `pnpm typecheck` ✅, `pnpm lint` ✅ (all 7 workspaces)

---

# 8. ARCHITECTURAL RULES (follow these strictly)

1. **Don't bypass layers**: `Route → Service → Client/Repository`. Never call
   external APIs from routes.
2. **Normalize external data**: raw GitHub/Jira payloads must pass through a
   mapper into `NormalizedDocument` before persistence. Nothing downstream may
   know provider schemas.
3. **Prisma lives behind database/repo boundaries** (`@project-intelligence/database`
   or `*.repository.ts` files). Services don't import Prisma directly.
4. **Raw SQL only where Prisma can't go** (pgvector operators, `metadata->>`
   JSON filters) via `prisma.$queryRaw` tagged templates.
5. **Idempotency**: persistence uses upserts keyed on natural unique
   constraints. Re-running syncs must never duplicate data.
6. **Don't ship fake integrations.** New providers implement the existing
   interfaces (`LLMProvider`, `EmbeddingProvider`, `Retriever`) or get a clean
   adapter with a real client.
7. **Env validation is mandatory**: every new env var goes in `EnvSchema` +
   `.env.example`. Secrets never logged, never committed, never sent to the
   frontend.
8. **Incremental commits-friendly scope**: implement one layer, verify with
   typecheck + lint + a dev route/script, then move on.
9. Code style: strict TS, named exports, no default exports, extensive JSDoc
   comments consistent with existing files.

---

# 9. WHAT IS DONE vs MISSING

## DONE (do not rebuild)

- [x] Monorepo, tooling, Docker infra, health checks
- [x] Prisma models + migrations (incl. `DocumentChunk.embedding vector(768)`)
- [x] GitHub integration (client/types/mappers/service/repository/factory)
- [x] BullMQ `github-sync` + `embedding-index` queues/workers, SyncJob state machine
- [x] Sync → auto-chunk → auto-embed chaining
- [x] Chunker + indexer (`packages/ai`)
- [x] Gemini embedding provider (768-dim, normalized, rate-limit-aware)
- [x] pgvector cosine retrieval + per-doc dedup
- [x] Activity/temporal retrieval with exhaustive mode
- [x] LangGraph agent (6 nodes, refine loop max 2, `[Source N]` citations)
- [x] OpenCode Go LLM provider (real), `createLLMFromEnv`
- [x] LangSmith tracing config + startup wiring (`configureTracingFromEnv`)
- [x] Dev routes for sync/index/search/agent

## MISSING (the build plan — priority order)

### 9.1 Web UI / Dashboard (Phase 6) — recommended next
Currently the web app is a hero page + health card. Build:

1. **Project dashboard**: list projects (`GET` new API route), pick the seeded
   `facebook/react` project, show sync status (poll
   `/dev/github/sync/:projectId/status` with TanStack Query).
2. **Sync controls**: "Sync now" button (POST sync route), SyncJob status
   badges (PENDING/RUNNING/COMPLETED/FAILED), records processed.
3. **Chat UI** for the agent: message input → call the agent route → render
   answer with `[Source N]` citations rendered as links using returned
   `sources[]`. No conversation persistence yet (that's 9.3/9.5).
4. **Search page**: semantic search box → results with similarity + links.

Prerequisites to add to the API first (keep the layering rules):
- `modules/projects/projects.routes.ts` + `projects.service.ts`:
  `GET /projects` (id, name, externalId, sourceType), `GET /projects/:id`
  (with latest SyncJob). Prisma access goes in a `projects.repository.ts`.
- Promote the dev agent/search routes to real modules later
  (`modules/agent/agent.routes.ts`) — keep dev routes until the UI migrates.
- Frontend conventions: `lib/api.ts` for typed fetchers, TanStack Query hooks
  in `hooks/`, Zod-parse responses with `@project-intelligence/types` schemas.

### 9.2 Jira integration (mirror the GitHub pattern exactly)
- `apps/api/src/integrations/jira/`: `jira.client.ts` (REST + Basic auth
  `email:api_token`), `jira.types.ts`, `jira.mapper.ts` (issues + comments →
  `NormalizedDocument`, `sourceType: "JIRA"`, `documentType: "ISSUE"` or
  `"PAGE"` for comments if modeled separately, `metadata: { key, status,
  project, updatedAt }`), `jira.service.ts` (sync by Jira project key),
  `jira.repository.ts` (reuse the same upsert logic — consider extracting a
  shared `document.repository.ts` used by both GitHub and Jira).
- Add `jira-sync` queue + worker (copy the github-sync worker; SyncJob already
  has `provider`).
- Env: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (already stubbed in
  `.env.example`). Extend `EnvSchema` + `ConnectionProvider` usage.
- Seed a Jira connection + project for dev testing.

### 9.3 Conversation persistence + chat API
- New Prisma models (add migration): `Conversation { id, projectId, title,
  createdAt, updatedAt }`, `Message { id, conversationId, role: USER|ASSISTANT,
  content, sources Json?, createdAt }`.
- New module `modules/conversations/`: `POST /conversations`,
  `GET /conversations/:id/messages`, `POST /conversations/:id/messages` →
  runs agent → stores user + assistant messages + sources.
- Pass recent history into the generate prompt (short-term memory, see 9.4).

### 9.4 Memory
- Short-term: rolling window of last N messages per conversation (from 9.3).
- Long-term: later — summarize conversations into a `Memory` table, embed and
  retrieve like documents. `packages/ai/src/memory/` is the intended home
  (currently `export {}` placeholder).

### 9.5 MCP tools (`apps/api/src/mcp/` is empty)
- Expose retrieval/search/activity as MCP tools so external MCP clients can
  use them, and/or let the agent call MCP servers. Decide contract first; keep
  it out of routes (Rule 1).

### 9.6 Structured citations / Evidence model
- Currently citations are `[Source N]` strings. Add an `Evidence` /
  `AgentRun` model recording: query, plans, chunks used (chunkId + documentId
  + similarity), answer id. Return structured sources in the API response
  (already partially done via `sources[]` in the agent route).

### 9.7 Auth + multi-tenancy
- Add `User`, `Membership` (user↔workspace) models; session/JWT auth;
  per-workspace scoping on every query. Replace the global `GITHUB_TOKEN` with
  encrypted per-Connection credentials (encrypt `Connection.credentials` with
  AES-GCM or similar; key from env; never decrypt into responses).

### 9.8 Performance / production hardening
- **ANN index** on embeddings: raw SQL migration
  `CREATE INDEX ... USING hnsw ("embedding" vector_cosine_ops)` (or ivfflat) —
  required before document counts grow.
- Sync cursor/pagination: use `SyncJob.cursor` (e.g. GitHub `since`/page) for
  incremental syncs instead of full refetch; chunk only *changed* documents
  (currently only un-chunked ones are chunked; edited bodies are missed).
- Production workers (currently started only when `NODE_ENV !== "production"`;
  decide separate worker process), prod Dockerfiles, rate limiting, structured
  logging, real test framework (vitest) covering mapper/repo/chunker/agent
  nodes.
- Convert dev GET routes (search/agent) to POST before productizing.
- Clean up: delete stale `packages/ai/src/langgraph/` (placeholder `graph.ts`
  + duplicated `state.ts`); real graph lives in `apps/api/src/agent/`.

---

# 10. VERIFICATION CHECKLIST (run after every change)

```bash
pnpm typecheck        # all 7 workspaces must pass
pnpm lint             # eslint flat config
```

Runtime verification flow (dev):

```bash
pnpm infra:up                      # postgres + redis
pnpm db:migrate && pnpm db:seed    # apply schema + seed dev data
pnpm dev                           # web 3000 + api 4000

# 1. sync (202 + syncJob id) — also auto-chains chunk+embed
curl -X POST http://localhost:4000/dev/github/sync/cmtgx0qbc0003lrh8t604v78b
# 2. watch status until COMPLETED
curl http://localhost:4000/dev/github/sync/cmtgx0qbc0003lrh8t604v78b/status
# 3. semantic search
curl "http://localhost:4000/dev/github/search/cmtgx0qbc0003lrh8t604v78b?q=concurrent+mode"
# 4. agent
curl "http://localhost:4000/dev/github/agent/cmtgx0qbc0003lrh8t604v78b?q=What+changed+last+month"
```

Project ID `cmtgx0qbc0003lrh8t604v78b` = seeded `facebook/react` project
(re-seed if you wiped volumes; check IDs with `pnpm db:studio`).

---

# 11. GOTCHAS / KNOWN ISSUES

1. `EMBEDDING_DIMENSIONS` (768) **must** match the `vector(768)` column —
   changing the embedding model requires a migration of the column type + full
   re-embed (run `apps/api/src/dev/reindex-project.ts` after deleting chunks).
2. `replaceDocumentChunks` deletes + recreates chunks → resets embeddings.
   `chunkProjectDocuments` intentionally only touches documents with
   `chunks: { none: {} }` to preserve embeddings; edited document bodies are
   NOT re-chunked yet (see 9.8).
3. Workers only start when `NODE_ENV !== "production"`.
4. LLM JSON parsing (decompose node) is defensive but not schema-validated —
   if you refactor, consider Zod-parsing the LLM output.
5. The old `PIA-CURRECT-STATE.md` claims sync/RAG/agent are "not implemented"
   — trust this document and the code instead.
6. `packages/ai/src/langgraph/graph.ts` is a stale throwing placeholder; the
   real graph is `apps/api/src/agent/graph.ts`. Don't wire anything to the
   stale one.
7. Activity results are adapted into `RetrievedChunk` with `similarity: 1`
   (temporary adapter in `agent/nodes/retrieve.ts`).
8. GitHub rate limits: unauthenticated is 60/hr; the dev token raises this.
   Sync fetches first 100 of each type only (no pagination yet).
9. `LangSmith` tracing only activates when `LANGSMITH_TRACING=true` AND
   `LANGSMITH_API_KEY` is set; `configureTracingFromEnv()` must run before the
   first LLM call (it runs at server startup — keep it there).
