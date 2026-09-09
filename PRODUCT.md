# PRODUCT.md — Project Intelligence Agent (PIA)

## What PIA is

An agentic RAG system for asking grounded questions about live engineering
project data. PIA connects a GitHub repository, synchronizes its issues, pull
requests and commits into a normalized knowledge base (PostgreSQL + pgvector),
and answers natural-language questions with cited, evidence-backed answers
through a LangGraph agent with retrieval refinement, project memory,
guardrails, and LangSmith observability.

## Audience

Engineers, tech leads and hiring managers evaluating the project. The primary
user is a developer asking questions like "What changed recently?", "How is
authentication implemented?", "Which PR introduced the caching layer?".

## The real scene

A developer switching context between code reviews and project questions,
often late in the day, often on a laptop. Screens are read in focused,
relatively short sessions. Both bright offices and dark rooms occur, so both
light and dark themes are first-class, defaulting to the system preference.

## Mode

**Operate.** The visitor completes a task: pick a project, ask a question,
trust the answer. Scanability, calm, and trustworthy presentation of evidence
outrank expression. The chat experience is the primary surface; the dashboard
answers "what is happening with this project?".

## What must be true in the UI

- Answers distinguish **project memory** (recalled knowledge) from
  **retrieved evidence** (cited sources). Memory is never presented as
  source evidence.
- Citations (`[Source N]`) remain visible and sources link out to the
  external resource when available.
- Every async surface has loading, empty, error and success states.
- Never display internal errors or stack traces; use calm, actionable copy.
- Only show metrics backed by real API data (sync status, records processed,
  last sync). Never fabricate analytics.
- The product is a serious engineering intelligence tool: restrained color
  (neutrals + one indigo accent), quiet depth, no decoration for its own
  sake.

## Constraints

- Next.js App Router + Tailwind v4 (CSS-first tokens) + shadcn/ui primitives +
  TanStack Query; Express API at a separate origin.
- Data comes only from the real API endpoints (see apps/web/src/lib/api.ts).
- Accessibility floor: semantic HTML, visible focus, labelled controls,
  screen-reader-friendly status regions, keyboard operable, respects
  `prefers-reduced-motion`.
