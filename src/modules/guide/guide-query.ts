import type { Locale } from "@/i18n/config";
import { localeHref } from "@/i18n/href";
import type { CalendarMonth, ProduceKind } from "../../domain";

export type GuideView = "list" | "chart";

export function parseGuideView(value: string | string[] | undefined): GuideView {
  if (Array.isArray(value)) {
    if (value.length !== 1) return "list";
    return value[0] === "chart" ? "chart" : "list";
  }
  return value === "chart" ? "chart" : "list";
}

export function guideQuery(
  calendarMonth: CalendarMonth | null,
  kind: ProduceKind | null,
  view: GuideView = "list",
): string {
  const parts: string[] = [];
  if (calendarMonth !== null) parts.push(`month=${calendarMonth}`);
  if (kind !== null) parts.push(`kind=${kind}`);
  if (view === "chart") parts.push("view=chart");
  if (parts.length === 0) return "";
  return `?${parts.join("&")}`;
}

export function guideHref(
  locale: Locale,
  calendarMonth: CalendarMonth | null,
  kind: ProduceKind | null,
  view: GuideView = "list",
): string {
  return localeHref(locale, `/guide${guideQuery(calendarMonth, kind, view)}`);
}
