import type { Locale } from "@/i18n/config";
import { localeHref } from "@/i18n/href";
import type { CalendarMonth, ProduceKind } from "../../domain";

export function guideQuery(calendarMonth: CalendarMonth | null, kind: ProduceKind | null): string {
  const parts: string[] = [];
  if (calendarMonth !== null) parts.push(`month=${calendarMonth}`);
  if (kind !== null) parts.push(`kind=${kind}`);
  if (parts.length === 0) return "";
  return `?${parts.join("&")}`;
}

export function guideHref(locale: Locale, calendarMonth: CalendarMonth | null, kind: ProduceKind | null): string {
  return localeHref(locale, `/guide${guideQuery(calendarMonth, kind)}`);
}
