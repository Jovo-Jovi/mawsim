import { calendarMonths, type CalendarMonth, type SeasonMonths } from "../../domain";

export interface SeasonSpan {
  readonly from: CalendarMonth;
  readonly to: CalendarMonth;
}

/** Contiguous calendar runs. A span that touches both January and December crosses the year boundary. */
export function seasonRuns(months: SeasonMonths): readonly SeasonSpan[] {
  const present = new Set<CalendarMonth>(months);
  const runs: SeasonSpan[] = [];
  let start: CalendarMonth | null = null;
  let previous: CalendarMonth | null = null;
  for (const calendarMonth of calendarMonths) {
    if (!present.has(calendarMonth)) continue;
    if (start === null || previous === null || calendarMonth !== previous + 1) {
      if (start !== null && previous !== null) runs.push({ from: start, to: previous });
      start = calendarMonth;
    }
    previous = calendarMonth;
  }
  if (start !== null && previous !== null) runs.push({ from: start, to: previous });
  if (runs.length < 2) return runs;
  const first = runs[0];
  const last = runs[runs.length - 1];
  if (first === undefined || last === undefined || first.from !== 1 || last.to !== 12) return runs;
  const wrapped: SeasonSpan = { from: last.from, to: first.to };
  const middle = runs.slice(1, -1);
  return [wrapped, ...middle].sort((left, right) => left.from - right.from);
}
