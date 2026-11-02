export const produceKinds = ["fruit", "vegetable", "leafy"] as const;

export type ProduceKind = (typeof produceKinds)[number];

export const calendarMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type CalendarMonth = (typeof calendarMonths)[number];

export type SeasonMonths = readonly CalendarMonth[];

const cairoMonthFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Cairo",
  month: "numeric",
});

export function isCalendarMonth(value: unknown): value is CalendarMonth {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
}

export function isInSeason(months: SeasonMonths, month: CalendarMonth): boolean {
  return months.includes(month);
}

export function cairoMonth(date: Date): CalendarMonth {
  const monthPart = cairoMonthFormat.formatToParts(date).find((part) => part.type === "month");
  const parsed = monthPart === undefined ? Number.NaN : Number(monthPart.value);
  if (!isCalendarMonth(parsed)) throw new Error("cairo month is outside 1-12");
  return parsed;
}

export function filterByKind<T extends { kind: ProduceKind }>(
  rows: readonly T[],
  kind: ProduceKind | null,
): T[] {
  if (kind === null) return rows.slice();
  return rows.filter((row) => row.kind === kind);
}

export function parseMonthParam(
  value: string | string[] | undefined,
  fallback: CalendarMonth,
): CalendarMonth {
  if (typeof value !== "string") return fallback;
  for (const month of calendarMonths) {
    if (String(month) === value) return month;
  }
  return fallback;
}

export function parseKindParam(value: string | string[] | undefined): ProduceKind | null {
  if (typeof value !== "string") return null;
  for (const kind of produceKinds) {
    if (kind === value) return kind;
  }
  return null;
}
