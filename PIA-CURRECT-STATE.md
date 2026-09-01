# Project Intelligence Agent (PIA)

## Development Context & Current Implementation Documentation

> **Purpose of this document:**
> This is a complete handoff/context document for continuing development of Project Intelligence Agent (PIA) in another ChatGPT instance.
> Read this document before making any changes to the project.
> The project is being built incrementally and manually so the developer understands the architecture and code rather than having an AI generate the entire codebase at once.

---

# 1. PROJECT OVERVIEW

## Project Name

**Project Intelligence Agent (PIA)**

## One-line description

PIA is an **agentic RAG platform for software/project intelligence**.

In simple words:

> PIA connects to live software-project data such as GitHub and Jira, builds a searchable knowledge base from that data, and eventually uses a LangGraph-based AI agent to answer project questions with evidence-backed, cited answers.

The important idea is that PIA is **not just a chatbot**.

The real system is:

```text
Live project data
      ↓
Synchronization
      ↓
Normalized project knowledge
      ↓
Retrieval
      ↓
Agent reasoning
      ↓
Tools / MCP
      ↓
Evidence
      ↓
Cited answer
```

---

# 2. ORIGINAL PROJECT VISION

The eventual system should connect to sources such as:

* GitHub
* Jira
* potentially other project/data sources later

It should be able to answer questions such as:

```text
"Why was the authentication feature delayed?"

"What changed in the payment system last month?"

"Which PR introduced this bug?"

"What work is currently blocking the release?"

"Who worked on this feature?"

"What happened between these two releases?"

"Which Jira issue corresponds to this PR?"

"What evidence supports this answer?"
```

The agent should be able to perform multi-step research rather than simply retrieving one document.

Eventually:

```text
User Question
      ↓
Understand question
      ↓
Plan research
      ↓
Retrieve relevant information
      ↓
Use GitHub/Jira/MCP tools when necessary
      ↓
Collect evidence
      ↓
Determine whether enough evidence exists
      ↓
Research more if necessary
      ↓
Synthesize answer
      ↓
Validate citations
      ↓
Return answer + evidence
```

---

# 3. CURRENT DEVELOPMENT PHILOSOPHY

The project is intentionally being built **one layer at a time**.

Do NOT jump directly into:

* LangGraph
* RAG
* MCP
* memory
* embeddings
* sophisticated agent behavior

The current strategy is:

```text
Foundation
   ↓
Data Layer
   ↓
Background Jobs
   ↓
Chunking + Embeddings
   ↓
Retrieval
   ↓
Basic RAG
   ↓
LangGraph Agent
   ↓
MCP
   ↓
Memory
   ↓
Evidence / Citations
   ↓
Evaluation
   ↓
Production Hardening
```

The reason is simple:

> The AI agent is useless if the underlying project data and ingestion system aren't reliable.

---

# 4. ORIGINAL TECHNOLOGY STACK

## Monorepo

* Turborepo 2.5
* pnpm 10
* TypeScript 5.8

## Frontend

* Next.js 16.3
* React 19.2
* Tailwind CSS v4
* shadcn/ui
* Radix UI
* TanStack Query 5
* Zod 4

## Backend

* Express 5.2
* TypeScript
* Zod
* Prisma 6.19
* PostgreSQL

## AI

* LangChain Core
* LangGraph
* LangSmith
* OpenCode Go
* DeepSeek V4 Flash

## Database

* PostgreSQL 16
* pgvector
* Prisma ORM

## Background jobs

* Redis 7
* BullMQ 5
* ioredis

## Development

* Docker
* Docker Compose
* ESLint 9
* Prettier 3
* dotenv

---

# 5. CURRENT MONOREPO STRUCTURE

```text
project-intelligence-agent/
│
├── apps/
│   ├── web/
│   │   └── Next.js frontend
│   │
│   └── api/
│       └── Express backend
│
├── packages/
│   ├── config/
│   │   └── Shared environment/configuration
│   │
│   ├── types/
│   │   └── Shared TypeScript types + Zod schemas
│   │
│   ├── database/
│   │   └── Prisma + PostgreSQL access
│   │
│   ├── ai/
│   │   └── LangChain/LangGraph/LangSmith/LLM abstraction
│   │
│   └── eslint-config/
│       └── Shared ESLint configuration
│
├── docker/
│   └── postgres/
│       └── init.sql
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── prettier.config.mjs
├── .env.example
└── README.md
```

---

# 6. FOUNDATION THAT EXISTED BEFORE THIS DEVELOPMENT SESSION

Before implementing the GitHub data layer, the repository already had a working foundation.

Implemented:

* Turborepo + pnpm monorepo
* shared TypeScript configuration
* strict TypeScript
* shared ESLint
* Prettier
* Next.js frontend
* Express backend
* PostgreSQL
* pgvector-enabled PostgreSQL container
* Redis
* Prisma
* BullMQ infrastructure
* shared types package
* shared config package
* AI package skeleton
* LangGraph placeholders
* LangSmith placeholder/configuration
* OpenCode provider placeholder
* health endpoints
* Redis health check
* database health check
* development BullMQ system queue/worker

At that point, no actual product functionality had been implemented.

---

# 7. CURRENT INFRASTRUCTURE

## PostgreSQL

Docker image:

```text
pgvector/pgvector:pg16
```

Port:

```text
5432
```

Local credentials:

```text
user: pia
password: pia
database: pia
```

Connection:

```text
postgresql://pia:pia@localhost:5432/pia
```

pgvector extension is enabled through:

```text
docker/postgres/init.sql
```

---

## Redis

Docker image:

```text
redis:7-alpine
```

Port:

```text
6379
```

Connection:

```text
redis://localhost:6379
```

Redis is intended for BullMQ background jobs and future related functionality.

---

# 8. ENVIRONMENT VARIABLES

Current important variables:

```env
API_PORT=4000

NEXT_PUBLIC_API_URL=http://localhost:4000

CORS_ORIGIN=http://localhost:3000

DATABASE_URL=postgresql://pia:pia@localhost:5432/pia

REDIS_URL=redis://localhost:6379

LLM_PROVIDER=opencode

LLM_MODEL=deepseek-v4-flash

LANGSMITH_TRACING=false
```

We added:

```env
GITHUB_TOKEN=
```

for the current development-only GitHub integration.

Important:

* The GitHub token must never be committed.
* The token must never be logged.
* This global `GITHUB_TOKEN` is a temporary development mechanism.
* Eventually GitHub credentials should belong to workspace/source connections rather than global application configuration.
* Production credential encryption/authentication has NOT been implemented yet.

---

# 9. CURRENT ENV VALIDATION

File:

```text
apps/api/src/config/env.ts
```

The API validates environment variables using Zod.

The current schema includes:

```typescript
GITHUB_TOKEN: z.string().min(1)
```

This means the API currently expects a GitHub token to be configured.

This is acceptable for the current development phase.

Later, when actual user/workspace GitHub connections are implemented, this should be redesigned.

---

# 10. CURRENT DATABASE SCHEMA

The Prisma schema is:

```text
packages/database/prisma/schema.prisma
```

Current enums:

```prisma
enum ConnectionProvider {
  GITHUB
  JIRA
}

enum ConnectionStatus {
  ACTIVE
  INACTIVE
  ERROR
}

enum DocumentSourceType {
  GITHUB
  JIRA
}

enum DocumentType {
  ISSUE
  PULL_REQUEST
  COMMIT
  FILE
  PAGE
}

enum SyncStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

---

# 11. HEALTH CHECK MODEL

Existing foundation model:

```prisma
model HealthCheck {
  id        String   @id @default(cuid())
  status    String   @default("ok")
  createdAt DateTime @default(now())
}
```

This was part of the original foundation and should not be removed.

---

# 12. WORKSPACE MODEL

Current:

```prisma
model Workspace {
  id      String   @id @default(cuid())
  name    String

  connections Connection[]
  projects    Project[]
  documents   Document[]
  syncJobs    SyncJob[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Conceptually:

```text
Workspace
   ├── Connections
   ├── Projects
   ├── Documents
   └── SyncJobs
```

A workspace represents the logical project environment.

---

# 13. CONNECTION MODEL

Current:

```prisma
model Connection {
  id          String             @id @default(cuid())
  workspaceId String

  provider    ConnectionProvider
  externalId  String
  credentials String?
  status      ConnectionStatus   @default(ACTIVE)

  workspace Workspace @relation(
    fields: [workspaceId],
    references: [id],
    onDelete: Cascade
  )

  projects Project[]
  syncJobs  SyncJob[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([workspaceId, provider, externalId])
  @@index([workspaceId])
}
```

A connection represents an external data source connection.

For example:

```text
Workspace
    ↓
GitHub Connection
```

Important:

`credentials` is currently just a string field.

Real encryption/secure credential management is NOT implemented yet.

---

# 14. PROJECT MODEL

Current:

```prisma
model Project {
  id           String   @id @default(cuid())
  workspaceId  String
  connectionId String

  name         String
  externalId   String
  sourceType   DocumentSourceType
  sourceUrl    String?

  workspace  Workspace @relation(
    fields: [workspaceId],
    references: [id],
    onDelete: Cascade
  )

  connection Connection @relation(
    fields: [connectionId],
    references: [id],
    onDelete: Cascade
  )

  documents Document[]
  syncJobs   SyncJob[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([connectionId, externalId])
  @@index([workspaceId])
}
```

For the current GitHub implementation:

```text
Project.externalId
```

uses:

```text
owner/repository
```

For example:

```text
facebook/react
```

This is a temporary simple convention.

Later, this can be replaced by more structured source metadata.

---

# 15. DOCUMENT MODEL

Current:

```prisma
model Document {
  id          String   @id @default(cuid())

  workspaceId String
  projectId   String

  sourceType  DocumentSourceType
  sourceId    String
  documentType DocumentType

  title       String
  content     String
  url         String?

  author      String?
  occurredAt  DateTime?

  metadata    Json?

  workspace Workspace @relation(
    fields: [workspaceId],
    references: [id],
    onDelete: Cascade
  )

  project Project @relation(
    fields: [projectId],
    references: [id],
    onDelete: Cascade
  )

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([sourceType, sourceId, documentType])
  @@index([workspaceId])
  @@index([projectId])
  @@index([sourceType])
  @@index([occurredAt])
}
```

This is the most important model currently.

It represents normalized source information.

The key architectural principle is:

```text
GitHub Issue
GitHub PR
GitHub Commit
Jira Issue
Jira Comment
...
        ↓
Normalized Document
```

The retrieval system should eventually work primarily against normalized documents rather than raw GitHub/Jira objects.

---

# 16. SYNC JOB MODEL

Current:

```prisma
model SyncJob {
  id           String   @id @default(cuid())

  workspaceId  String
  connectionId String
  projectId    String?

  provider     ConnectionProvider
  status       SyncStatus @default(PENDING)

  startedAt    DateTime?
  completedAt  DateTime?

  recordsProcessed Int @default(0)

  error        String?
  cursor       String?

  workspace Workspace @relation(
    fields: [workspaceId],
    references: [id],
    onDelete: Cascade
  )

  connection Connection @relation(
    fields: [connectionId],
    references: [id],
    onDelete: Cascade
  )

  project Project? @relation(
    fields: [projectId],
    references: [id],
    onDelete: Cascade
  )

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([workspaceId])
  @@index([connectionId])
  @@index([projectId])
  @@index([status])
}
```

This model already exists in preparation for the background synchronization phase.

It is not yet fully integrated with the GitHub synchronization pipeline.

---

# 17. SHARED TYPES PACKAGE

File:

```text
packages/types/src/index.ts
```

The package contains the original foundation contracts as well as new data-layer types.

Important existing types that MUST be preserved:

```typescript
healthResponseSchema
HealthResponse
apiErrorResponseSchema
ApiErrorResponse
Paginated<T>
```

The health response currently includes:

```typescript
status: string;
service: string;
timestamp: string;
```

This is required by the existing frontend.

Do NOT remove `timestamp`.

---

# 18. CURRENT NORMALIZED DOCUMENT TYPE

The application-level normalized document is:

```typescript
export interface NormalizedDocument {
  sourceType: "GITHUB" | "JIRA";

  sourceId: string;

  documentType:
    | "ISSUE"
    | "PULL_REQUEST"
    | "COMMIT"
    | "FILE"
    | "PAGE";

  title: string;

  content: string;

  url?: string;

  author?: string;

  occurredAt?: Date;

  metadata?: Record<string, unknown>;
}
```

This intentionally stays independent of Prisma.

---

# 19. WHY NORMALIZATION EXISTS

This is one of the most important architectural decisions in PIA.

We do NOT want the retrieval/agent layer to have to know about every external provider's API schema.

Instead:

```text
GitHub Issue
     ↓
GitHub Mapper
     ↓
NormalizedDocument

GitHub PR
     ↓
GitHub Mapper
     ↓
NormalizedDocument

Jira Issue
     ↓
Jira Mapper
     ↓
NormalizedDocument
```

Then:

```text
Retrieval
   ↓
Document
```

rather than:

```text
Retrieval
   ├── GitHub Issue
   ├── GitHub PR
   ├── Jira Issue
   ├── Jira Comment
   └── ...
```

This makes the system much easier to extend.

---

# 20. GITHUB INTEGRATION

Directory:

```text
apps/api/src/integrations/github/
```

Current files:

```text
github.client.ts
github.types.ts
github.mapper.ts
github.service.ts
github.repository.ts
github.config.ts
github.factory.ts
index.ts
```

---

# 21. GITHUB TYPES

File:

```text
apps/api/src/integrations/github/github.types.ts
```

Current GitHub models represent:

* repository
* user
* issue
* pull request
* commit

The commit model correctly represents GitHub's response structure where commit message data lives under:

```text
commit.commit.message
```

rather than:

```text
commit.message
```

This was discovered and fixed during the first real integration test.

---

# 22. GITHUB CLIENT

File:

```text
apps/api/src/integrations/github/github.client.ts
```

Responsibilities:

* communicate with GitHub REST API
* attach GitHub authentication token
* make typed requests
* retrieve repository data
* retrieve issues
* retrieve pull requests
* retrieve commits

Current operations:

```typescript
getRepository(owner, repository)

getIssues(owner, repository)

getPullRequests(owner, repository)

getCommits(owner, repository)
```

The GitHub API base URL is:

```text
https://api.github.com
```

The client uses:

```text
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

and:

```text
Authorization: Bearer <token>
```

The client is intentionally isolated from the rest of the application.

---

# 23. GITHUB MAPPER

File:

```text
apps/api/src/integrations/github/github.mapper.ts
```

Current mappings:

```typescript
mapIssueToDocument()

mapPullRequestToDocument()

mapCommitToDocument()
```

Conceptually:

```text
GitHub Issue
      ↓
NormalizedDocument

GitHub PR
      ↓
NormalizedDocument

GitHub Commit
      ↓
NormalizedDocument
```

---

# 24. GITHUB ISSUE NORMALIZATION

An issue becomes approximately:

```typescript
{
  sourceType: "GITHUB",
  sourceId: String(issue.id),
  documentType: "ISSUE",
  title: issue.title,
  content: issue.body ?? "",
  url: issue.html_url,
  author: issue.user?.login,
  occurredAt: new Date(issue.created_at),
  metadata: {
    number: issue.number,
    state: issue.state,
    updatedAt: issue.updated_at
  }
}
```

GitHub's `/issues` endpoint also returns pull requests.

The service explicitly skips those issue objects because pull requests are fetched separately.

---

# 25. GITHUB PULL REQUEST NORMALIZATION

A pull request becomes approximately:

```typescript
{
  sourceType: "GITHUB",
  sourceId: String(pullRequest.id),
  documentType: "PULL_REQUEST",
  title: pullRequest.title,
  content: pullRequest.body ?? "",
  url: pullRequest.html_url,
  author: pullRequest.user?.login,
  occurredAt: new Date(pullRequest.created_at),
  metadata: {
    number: pullRequest.number,
    state: pullRequest.state,
    mergedAt: pullRequest.merged_at,
    updatedAt: pullRequest.updated_at
  }
}
```

---

# 26. GITHUB COMMIT NORMALIZATION

A commit becomes approximately:

```typescript
{
  sourceType: "GITHUB",
  sourceId: commit.sha,
  documentType: "COMMIT",

  title:
    commit.commit.message.split("\n")[0] ??
    commit.sha,

  content: commit.commit.message,

  url: commit.html_url,

  ...(commit.author?.login
    ? { author: commit.author.login }
    : {}),

  ...(occurredAt
    ? { occurredAt }
    : {}),

  metadata: {
    sha: commit.sha,
    authorEmail: commit.commit.author?.email
  }
}
```

Important:

The author property is conditionally included because GitHub may return commits without an associated GitHub user.

---

# 27. GITHUB SERVICE

File:

```text
apps/api/src/integrations/github/github.service.ts
```

Responsibilities:

* fetch GitHub data
* coordinate the different API calls
* normalize GitHub data
* persist normalized documents

Current flow:

```text
getIssues()
getPullRequests()
getCommits()
        ↓
      Mapper
        ↓
NormalizedDocument[]
        ↓
saveGitHubDocuments()
```

The API calls are made in parallel using `Promise.all`.

Current service input:

```typescript
{
  owner: string;
  repository: string;
  workspaceId: string;
  projectId: string;
}
```

Current result:

```typescript
{
  documents: NormalizedDocument[];
  created: number;
  updated: number;
}
```

---

# 28. GITHUB REPOSITORY

File:

```text
apps/api/src/integrations/github/github.repository.ts
```

This is the persistence boundary.

Responsibilities:

* receive normalized documents
* check for existing documents
* upsert documents through Prisma
* count created/updated documents

Current persistence flow:

```text
NormalizedDocument
        ↓
github.repository
        ↓
Prisma
        ↓
PostgreSQL
```

Prisma remains inside the database/repository boundary.

The API/service layer should not directly depend on Prisma for GitHub document persistence.

---

# 29. IDEMPOTENCY

The Document model has:

```prisma
@@unique([sourceType, sourceId, documentType])
```

This allows the repository to use:

```text
upsert
```

rather than blindly inserting.

Therefore:

First synchronization:

```text
240 records
240 created
0 updated
```

Second synchronization:

```text
240 records
0 created
240 updated
```

The exact number can vary depending on source data, but the important behavior is:

> Re-running synchronization does not create duplicate documents.

This behavior has already been verified against a real GitHub repository.

---

# 30. DATABASE SEED

File:

```text
packages/database/prisma/seed.ts
```

A development seed was created to generate:

```text
Workspace
    ↓
GitHub Connection
    ↓
Project
```

Current development records:

```text
Workspace:
PIA Development Workspace
```

Connection:

```text
provider: GITHUB
externalId: github-development
status: ACTIVE
```

Project:

```text
name: React
externalId: facebook/react
sourceType: GITHUB
sourceUrl: https://github.com/facebook/react
```

The seed uses `upsert`, so running it multiple times does not create duplicate records.

The observed project ID is:

```text
cmtgx0qbc0003lrh8t604v78b
```

The observed connection ID is:

```text
cmtgx0qad0001lrh8771p5i6g
```

The workspace ID is:

```text
pia-dev-workspace
```

These are development values and should not be treated as permanent production IDs.

---

# 31. FIRST REAL GITHUB SYNC

A development-only route was created:

```text
POST /dev/github/sync/:projectId
```

File:

```text
apps/api/src/modules/dev/github.routes.ts
```

The route:

1. finds the project
2. validates that the project exists
3. verifies it is a GitHub project
4. parses:

```text
owner/repository
```

from `Project.externalId`
5. creates a GitHub client
6. creates a GitHub service
7. runs synchronization
8. returns the synchronization result

---

# 32. VERIFIED END-TO-END RESULT

The endpoint was successfully called against:

```text
facebook/react
```

using project ID:

```text
cmtgx0qbc0003lrh8t604v78b
```

The first sync returned:

```json
{
  "success": true,
  "project": {
    "id": "cmtgx0qbc0003lrh8t604v78b",
    "name": "React"
  },
  "recordsProcessed": 240,
  "created": 240,
  "updated": 0
}
```

The same sync was then executed again.

The idempotent behavior was verified successfully.

Therefore:

> **PIA can currently fetch real GitHub project data, normalize it, and persist it into PostgreSQL without creating duplicates on repeated synchronization.**

This is the first major functional milestone.

---

# 33. CURRENT ARCHITECTURE

The current working architecture is:

```text
                 GitHub API
                     ↓
              GitHubClient
                     ↓
              GitHubService
                 /   |   \
                /    |    \
           Issues   PRs   Commits
                \    |    /
                 \   |   /
                  Mappers
                     ↓
          NormalizedDocument[]
                     ↓
             GitHub Repository
                     ↓
                  Prisma
                     ↓
               PostgreSQL
```

This currently happens synchronously through:

```text
POST /dev/github/sync/:projectId
```

---

# 34. WHAT IS NOT IMPLEMENTED YET

The following are intentionally NOT implemented:

## Background synchronization

BullMQ exists, but GitHub synchronization is still synchronous.

Not implemented:

```text
SyncJob creation
BullMQ GitHub queue
GitHub worker
progress updates
retry handling
```

---

## Jira

Not implemented.

---

## Embeddings

Not implemented.

---

## pgvector retrieval

Not implemented.

The PostgreSQL container supports pgvector, but no document embeddings have been added yet.

---

## Chunking

Not implemented.

---

## RAG

Not implemented.

---

## LangGraph

Only placeholder infrastructure exists.

No real agent workflow exists.

---

## MCP

Not implemented.

---

## Memory

Not implemented.

---

## Citations

Not implemented.

---

## Evidence model

Not implemented.

---

## LangSmith tracing

Not actively enabled.

---

## Authentication

Not implemented.

---

## Product dashboard

Not implemented.

---

## Production GitHub authentication

Not implemented.

The current `GITHUB_TOKEN` is only a development mechanism.

---

# 35. IMPORTANT TEMPORARY DECISIONS

## Global GitHub token

Currently:

```env
GITHUB_TOKEN=
```

This is temporary.

Eventually:

```text
Workspace
   ↓
Connection
   ↓
encrypted credentials
```

should be used.

Do not expose credentials to the frontend.

---

## Project external ID

Currently:

```text
owner/repository
```

Example:

```text
facebook/react
```

This is intentionally simple for the first implementation.

---

## Synchronous sync endpoint

Current:

```text
POST /dev/github/sync/:projectId
```

This is intentionally synchronous.

The purpose was to first prove:

```text
GitHub → normalization → database
```

before introducing asynchronous job infrastructure.

---

# 36. IMPORTANT ARCHITECTURAL RULES

Follow these rules when continuing development.

## Rule 1 — Don't bypass layers

Do not do:

```text
Route → GitHub API
```

Instead:

```text
Route
 ↓
Service
 ↓
GitHubClient
```

---

## Rule 2 — Don't let raw GitHub data leak

External API data should be normalized.

```text
GitHub response
      ↓
Mapper
      ↓
NormalizedDocument
```

The rest of the application should work with the normalized representation.

---

## Rule 3 — Keep Prisma behind database/repository boundaries

Don't randomly import Prisma into every service.

Current architecture:

```text
apps/api
    ↓
@project-intelligence/database
    ↓
Prisma
```

The database package owns Prisma.

---

## Rule 4 — Don't prematurely implement everything

Do not jump ahead to:

* agents
* MCP
* memory
* advanced RAG
* UI

until the data infrastructure is stable.

---

# 37. CURRENT DEVELOPMENT COMMANDS

From repository root:

Start infrastructure:

```bash
pnpm infra:up
```

Stop infrastructure:

```bash
pnpm infra:down
```

Clean infrastructure:

```bash
pnpm infra:down:clean
```

Start development:

```bash
pnpm dev
```

Frontend only:

```bash
pnpm dev:web
```

Backend only:

```bash
pnpm dev:api
```

Typecheck:

```bash
pnpm typecheck
```

Lint:

```bash
pnpm lint
```

Build:

```bash
pnpm build
```

Format:

```bash
pnpm format
```

Prisma generate:

```bash
pnpm db:generate
```

Create/apply development migration:

```bash
pnpm db:migrate
```

Deploy migrations:

```bash
pnpm db:migrate:deploy
```

Push schema:

```bash
pnpm db:push
```

Prisma Studio:

```bash
pnpm db:studio
```

Database seed:

```bash
pnpm db:seed
```

---

# 38. CURRENT VERIFICATION STATUS

The following have been successfully verified during development:

```text
pnpm typecheck    ✅
pnpm lint         ✅
```

The database seed successfully ran.

The development workspace, connection and project were successfully created.

Prisma Studio successfully showed the created records.

The GitHub synchronization endpoint successfully connected to GitHub.

The system successfully processed 240 records in the first observed synchronization.

The documents were persisted to PostgreSQL.

The synchronization was executed a second time.

Duplicate creation was successfully prevented.

---

# 39. CURRENT DEVELOPMENT MILESTONE

## Milestone 1 — GitHub Data Ingestion

Status:

**COMPLETE**

Completed:

```text
[x] Database domain models
[x] Workspace
[x] Connection
[x] Project
[x] Document
[x] SyncJob model
[x] Shared domain types
[x] GitHub client
[x] GitHub types
[x] GitHub mappers
[x] GitHub service
[x] GitHub repository
[x] GitHub environment configuration
[x] GitHub client factory
[x] Development seed
[x] Development sync endpoint
[x] PostgreSQL persistence
[x] Idempotent synchronization
[x] Real GitHub data verification
```

---

# 40. NEXT PHASE

## Phase 2 — Background Sync Engine

This is the immediate next development task.

The current system:

```text
POST /dev/github/sync/:projectId
        ↓
GitHubService
        ↓
PostgreSQL
```

should become:

```text
POST /dev/github/sync/:projectId
        ↓
Create SyncJob
        ↓
BullMQ
        ↓
Redis
        ↓
GitHub Worker
        ↓
GitHubService
        ↓
PostgreSQL
        ↓
Update SyncJob
```

---

# 41. BULLMQ TARGET FLOW

The intended state machine:

```text
PENDING
   ↓
RUNNING
   ↓
COMPLETED
```

or:

```text
PENDING
   ↓
RUNNING
   ↓
FAILED
```

The `SyncJob` model already contains:

```text
status
startedAt
completedAt
recordsProcessed
error
cursor
```

These should now be wired into the actual synchronization workflow.

---

# 42. NEXT PHASE FEATURES

Phase 2 should implement:

* GitHub sync queue
* job producer
* GitHub sync worker
* SyncJob creation
* SyncJob state transitions
* records processed updates
* failure handling
* retry behavior
* Redis-backed asynchronous execution
* development sync status endpoint

The API should eventually return quickly after enqueueing a job rather than waiting for GitHub synchronization to finish.

---

# 43. EXPECTED NEXT ARCHITECTURE

```text
                   HTTP Client
                       │
                       ▼
             POST /dev/github/sync
                       │
                       ▼
               SyncJobService
                       │
                       ├── create SyncJob
                       │       status=PENDING
                       │
                       ▼
                  BullMQ Queue
                       │
                       ▼
                  Redis
                       │
                       ▼
                GitHub Worker
                       │
                       ├── status=RUNNING
                       │
                       ▼
                GitHubService
                       │
                       ▼
                  GitHub API
                       │
                       ▼
                    Mapper
                       │
                       ▼
                Repository
                       │
                       ▼
                  PostgreSQL
                       │
                       ▼
                SyncJob update
                       │
                       ▼
               COMPLETED / FAILED
```

---

# 44. LONG-TERM ROADMAP

After background jobs:

## Phase 3 — Chunking + Embeddings

```text
Document
   ↓
Chunking
   ↓
DocumentChunk
   ↓
Embedding
   ↓
pgvector
```

---

## Phase 4 — Retrieval

Build:

```text
searchDocuments()
```

Support:

* semantic search
* keyword/exact lookup
* metadata filtering
* temporal filtering
* hybrid retrieval

---

## Phase 5 — Basic RAG

Before autonomous agent behavior:

```text
Question
   ↓
Retriever
   ↓
Relevant chunks
   ↓
LLM
   ↓
Answer
```

This provides a baseline RAG system.

---

## Phase 6 — LangGraph Agent

Then introduce actual agentic behavior:

```text
Question
   ↓
Planner
   ↓
Retrieve / Tools
   ↓
Evidence
   ↓
Enough evidence?
   ├── No → Research more
   └── Yes
         ↓
      Synthesis
         ↓
      Citation validation
         ↓
       Answer
```

---

## Phase 7 — MCP

Expose external capabilities through MCP.

Eventually:

```text
LangGraph Agent
      ↓
    MCP
   /   \
GitHub Jira
```

---

## Phase 8 — Memory

Add:

* short-term conversation state
* long-term project/user memory
* memory retrieval
* memory write decisions

---

## Phase 9 — Evidence + Citations

Add:

```text
Evidence
Citation
AgentRun
ToolCall
```

and make answers traceable to source documents.

---

## Phase 10 — Evaluation

Build evaluation around:

* retrieval quality
* answer correctness
* citation correctness
* tool-use correctness
* agent behavior
* hallucination resistance

---

## Phase 11 — Production Hardening

Eventually:

* authentication
* authorization
* encrypted credentials
* GitHub OAuth/App
* Jira authentication
* rate-limit handling
* production Docker images
* CI/CD
* observability
* security controls
* deployment

---

# 45. HOW THE DEVELOPER WANTS TO WORK

The developer specifically wants to **understand the code while building the project**.

Therefore:

### DO:

* provide one small layer/file at a time
* explain why the file exists
* explain architectural decisions
* explain TypeScript errors
* explain runtime errors
* run typecheck after meaningful changes
* run lint after meaningful changes
* test functionality incrementally
* preserve existing working architecture
* use the actual existing files/schema as the source of truth

### DON'T:

* dump 30–50 files at once
* generate the entire project in one prompt
* blindly replace existing files
* overwrite existing shared types
* assume the existing schema matches an imagined schema
* hide errors with `as any`
* skip typechecking
* skip runtime verification
* jump ahead to LangGraph before the data layer is stable

---

# 46. LESSONS FROM THE IMPLEMENTATION SO FAR

Several issues were discovered and fixed during development.

## Shared types must be preserved

An initial change accidentally removed:

```text
HealthResponse
healthResponseSchema
ApiErrorResponse
Paginated
```

from the shared types package.

This broke the existing frontend.

The fix was to preserve foundation contracts and extend them rather than replacing them.

---

## HealthResponse includes timestamp

The frontend expects:

```typescript
timestamp
```

Therefore the schema must include:

```typescript
timestamp: z.string()
```

Do not remove it.

---

## Prisma schema is the source of truth

The actual Prisma enum contains:

```text
ISSUE
PULL_REQUEST
COMMIT
FILE
PAGE
```

It does NOT contain:

```text
COMMENT
```

Therefore shared domain types must align with the actual database model.

---

## Prisma JSON types are stricter

Application-level:

```typescript
Record<string, unknown>
```

does not directly satisfy Prisma's JSON input type.

JSON conversion is handled at the repository boundary.

The database package owns Prisma types.

---

## Prisma should remain behind the database package

The API does not directly install/use `@prisma/client`.

Instead:

```text
apps/api
    ↓
@project-intelligence/database
    ↓
Prisma
```

The database package exports Prisma where needed.

---

## GitHub commit structure matters

GitHub commit messages are nested:

```text
commit.commit.message
```

not:

```text
commit.message
```

The first runtime sync exposed this mismatch.

The mapper and GitHub types were corrected accordingly.

---

## GitHub `/issues` includes pull requests

GitHub's issues endpoint can return pull requests.

Therefore the service skips:

```typescript
if (issue.pull_request) {
  continue;
}
```

because pull requests are fetched separately.

---

# 47. CURRENT PIA MENTAL MODEL

The project should be thought of as several layers.

```text
┌─────────────────────────────┐
│          UI / Web            │
│         Next.js              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          API Layer           │
│          Express             │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐   ┌──────────────┐
│ Integrations│   │ Background   │
│ GitHub/Jira │   │ Jobs/BullMQ  │
└──────┬──────┘   └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │   Data Layer    │
       │ Prisma/Postgres │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │   Retrieval     │
       │   pgvector      │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │   AI / Agent    │
       │ LangChain       │
       │ LangGraph       │
       │ LangSmith       │
       │ OpenCode Go     │
       └─────────────────┘
```

---

# 48. THE BIG PICTURE

Eventually PIA should look like:

```text
                 ┌──────────────┐
                 │   Next.js    │
                 │      UI      │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   Express    │
                 │     API      │
                 └──────┬───────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
      GitHub/Jira    BullMQ         AI Agent
      integrations    Redis        LangGraph
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                 ┌──────────────┐
                 │  PostgreSQL  │
                 │  + pgvector  │
                 └──────┬───────┘
                        │
                        ▼
                Project Knowledge
                        │
                        ▼
               Retrieval + Memory
                        │
                        ▼
                  Agent Research
                        │
                        ▼
              Evidence-backed answer
```

---

# 49. CURRENT STATUS SUMMARY

## Foundation

**COMPLETE**

## Database domain layer

**COMPLETE**

## GitHub ingestion

**COMPLETE**

## PostgreSQL persistence

**COMPLETE**

## Idempotency

**VERIFIED**

## Background synchronization

**NEXT**

## RAG

**NOT STARTED**

## LangGraph

**NOT STARTED**

## MCP

**NOT STARTED**

## Memory

**NOT STARTED**

## Citations

**NOT STARTED**

## Evaluation

**NOT STARTED**

## Production authentication/security

**NOT STARTED**

---

# 50. IMMEDIATE NEXT TASK

Do NOT redesign the existing GitHub ingestion code.

The next task is:

> **Convert the synchronous GitHub synchronization into an asynchronous BullMQ-based synchronization pipeline using the existing Redis infrastructure and the existing SyncJob model.**

The first target should be:

```text
POST /dev/github/sync/:projectId
        ↓
Create SyncJob(PENDING)
        ↓
Enqueue BullMQ job
        ↓
Return job ID
```

Then worker:

```text
BullMQ
   ↓
SyncJob → RUNNING
   ↓
GitHubService
   ↓
Repository
   ↓
SyncJob → COMPLETED
```

Failure:

```text
SyncJob → FAILED
error → stored
```

After that, add:

```text
GET /dev/github/sync/:projectId/status
```

to inspect the latest synchronization.

---

# 51. IMPORTANT INSTRUCTION FOR THE NEXT CHATGPT INSTANCE

When continuing this project:

1. Treat this document as the current project state.
2. Do not assume anything beyond what is explicitly documented.
3. Ask for the actual current file if a change depends on code not shown here.
4. Do not replace existing files wholesale unless necessary.
5. Preserve existing foundation contracts.
6. Make changes incrementally.
7. Explain each file before providing it.
8. Let the developer copy/paste the code manually.
9. After each logical step, run:

   * `pnpm typecheck`
   * `pnpm lint`
10. Do not move to the next architectural layer until the current one works.
11. Do not implement RAG/LangGraph/MCP prematurely.
12. Keep the architecture clean and modular.
13. Never claim something works without actually verifying it.
14. Prefer understanding and correctness over speed.

---

# 52. CURRENT PROJECT ACHIEVEMENT

PIA has successfully progressed from:

```text
Empty AI project foundation
```

to:

```text
Real GitHub repository
        ↓
GitHub API
        ↓
Typed integration
        ↓
Normalization
        ↓
Idempotent persistence
        ↓
PostgreSQL
```

A real repository synchronization was executed successfully and **240 records were ingested into PostgreSQL** during the first verified sync.

The same synchronization was repeated and duplicate creation was successfully prevented.

This is the current stable checkpoint from which development should continue.
