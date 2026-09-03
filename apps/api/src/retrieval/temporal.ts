import type { TemporalRange } from "../agent/state";

export interface TemporalRangeResult {
  from: Date;
  to: Date;
}

export function resolveTemporalRange(range: TemporalRange, now = new Date()): TemporalRangeResult {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  switch (range) {
    case "today": {
      const from = new Date(Date.UTC(year, month, now.getUTCDate()));

      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 1);

      return { from, to };
    }

    case "yesterday": {
      const to = new Date(Date.UTC(year, month, now.getUTCDate()));

      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 1);

      return { from, to };
    }

    case "this_week": {
      const currentDay = now.getUTCDay();
      const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

      const from = new Date(Date.UTC(year, month, now.getUTCDate()));

      from.setUTCDate(from.getUTCDate() - daysSinceMonday);

      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 7);

      return { from, to };
    }

    case "last_week": {
      const currentDay = now.getUTCDay();
      const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;

      const to = new Date(Date.UTC(year, month, now.getUTCDate()));

      to.setUTCDate(to.getUTCDate() - daysSinceMonday);

      const from = new Date(to);
      from.setUTCDate(from.getUTCDate() - 7);

      return { from, to };
    }

    case "this_month": {
      const from = new Date(Date.UTC(year, month, 1));

      const to = new Date(Date.UTC(year, month + 1, 1));

      return { from, to };
    }

    case "last_month": {
      const from = new Date(Date.UTC(year, month - 1, 1));

      const to = new Date(Date.UTC(year, month, 1));

      return { from, to };
    }

    case "this_quarter": {
      const quarterStartMonth = Math.floor(month / 3) * 3;

      const from = new Date(Date.UTC(year, quarterStartMonth, 1));

      const to = new Date(Date.UTC(year, quarterStartMonth + 3, 1));

      return { from, to };
    }

    case "last_quarter": {
      const quarterStartMonth = Math.floor(month / 3) * 3;

      const to = new Date(Date.UTC(year, quarterStartMonth, 1));

      const from = new Date(Date.UTC(year, quarterStartMonth - 3, 1));

      return { from, to };
    }

    case "this_year": {
      const from = new Date(Date.UTC(year, 0, 1));
      const to = new Date(Date.UTC(year + 1, 0, 1));

      return { from, to };
    }

    case "last_year": {
      const from = new Date(Date.UTC(year - 1, 0, 1));
      const to = new Date(Date.UTC(year, 0, 1));

      return { from, to };
    }

    case "custom":
      throw new Error("Custom temporal ranges must provide explicit dates");
  }
}
