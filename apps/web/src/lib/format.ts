/**
 * Date formatting helpers shared across the app.
 */

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return "never";
  }

  const date = new Date(iso);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return "unknown";
  }

  const seconds = Math.round((Date.now() - timestamp) / 1000);

  if (seconds < 45) {
    return "just now";
  }

  const intervals: Array<{ unit: string; seconds: number }> = [
    { unit: "minute", seconds: 60 },
    { unit: "hour", seconds: 3_600 },
    { unit: "day", seconds: 86_400 },
    { unit: "week", seconds: 604_800 },
    { unit: "month", seconds: 2_592_000 },
    { unit: "year", seconds: 31_536_000 },
  ];

  for (let index = intervals.length - 1; index >= 0; index--) {
    const interval = intervals[index]!;

    if (seconds >= interval.seconds) {
      const value = Math.floor(seconds / interval.seconds);
      const plural = value === 1 ? "" : "s";

      return `${value} ${interval.unit}${plural} ago`;
    }
  }

  return "just now";
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "Never";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
