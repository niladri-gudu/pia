# DESIGN.md — PIA design system

Durable visual decisions, documented from the built product. Tokens live in
`apps/web/src/app/globals.css` (Tailwind v4 CSS-first); shared async-state
primitives live in `apps/web/src/components/states.tsx`.

## World

Calm engineering-intelligence console. Restrained color strategy: cool neutral
surfaces + one indigo accent reserved for primary actions, active selection
and status. Hairline borders carry hierarchy; depth is quiet (no halos, no
glass). Geist Sans carries all UI; Geist Mono is reserved for code, repo
identifiers and inline code. Tabular numerals (`.tabular`) for counts,
similarity and dates.

## Themes

Both light and dark are first-class. `.dark` class on `<html>`; system
preference by default (init script in `app/layout.tsx`, FOUC-free); user
choice persisted to `localStorage["pia-theme"]` via `ThemeToggle`.

## Color tokens (semantic)

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | near-white cool paper | deep blue-black | page ground |
| `card` | white | elevated blue-black | cards, panels |
| `sidebar` | slightly cooler than bg | darker than bg | conversation rail |
| `primary` | indigo `oklch(0.51 0.185 277)` | lighter indigo | primary actions, active tab, user bubble, wordmark |
| `accent` | indigo-tinted wash | indigo-tinted wash | hover on interactive chips/items |
| `muted` / `muted-foreground` | cool gray | cool gray | secondary surfaces / text |
| `border` / `input` | hairline | translucent white | hierarchy, form controls |
| `destructive` | red | lighter red | errors only |
| `success` / `warning` / `info` | green / amber / blue | same, lifted | status dots + inline labels only, never fills |

Status vocabulary (see `SyncStatusPill`): Queued (warning), Syncing (info,
breathing dot), Indexed (success), Failed (destructive). Color is never the
only signal — the pill always carries a text label.

## Typography

Single family (Geist Sans), fixed rem scale for an Operate surface:
page title `text-2xl`/semibold/tracking-tight · section heading `text-lg` ·
card/list title `text-sm font-medium`/`font-semibold` · body `text-sm leading-6` ·
metadata `text-xs text-muted-foreground` · data/code `font-mono text-xs`.
Assistant answers render through `Markdown` (document typography: sized
headings, marker-muted lists, bordered code blocks, accent links).

## Spacing & shape

Tailwind 4px scale only. Page padding `px-6 py-10` (dashboard), dense app
chrome `px-4 py-2.5`/`py-3`. Radius scale from `--radius: 0.625rem`
(`rounded-lg` controls, `rounded-xl` cards, `rounded-full` chips/pills).
Elevation: one soft shadow on overlays (drawer) only; borders do the rest.

## Components & patterns

- shadcn/ui primitives: `button`, `badge`, `input`, `card` (card used sparingly;
  nested cards avoided).
- Shared states: `LoadingSkeleton`, `ErrorState` (title + description + Try
  again), `EmptyState` (icon + title + description + action), `SyncStatusPill`.
- Layout: dashboard is a normal scrolling page; the project page is a
  viewport-locked workspace (`h-dvh` chain) so the composer stays reachable —
  header → tab bar → rail + transcript + pinned composer.
- The conversation rail is persistent at `lg+`; below `lg` it becomes a Radix
  Dialog drawer (`ConversationDrawer`) with focus management and Escape.
- Motion: 150–250ms transitions, one breathing status dot, a calm
  `pending-dot` blink while researching; everything respects
  `prefers-reduced-motion`.

## Accessibility floor

Semantic landmarks (`header`, `nav`, `[role=log]`), `aria-live` for pending
and result counts, labelled inputs (`sr-only` labels where placeholder-only
would be lossy), `aria-current` on the active conversation, visible focus
rings on every interactive element, text labels beside every status color.
