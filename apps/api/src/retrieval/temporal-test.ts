import { resolveTemporalRange } from "./temporal";

const now = new Date("2026-09-03T17:18:00Z");

const cases = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
] as const;

for (const range of cases) {
  const result = resolveTemporalRange(range, now);

  console.log(
    `${range.padEnd(16)} ${result.from.toISOString()} → ${result.to.toISOString()}`,
  );
}