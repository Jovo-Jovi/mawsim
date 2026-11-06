import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import type { CalendarMonth, ProduceKind } from "../../domain";
import type { GuideView } from "./guide-query";
import { MonthPicker } from "./index";

const englishShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const arabicShort = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function markup(
  locale: Locale,
  selectedMonth: CalendarMonth,
  currentMonth: CalendarMonth,
  kind: ProduceKind | null,
  view: GuideView = "list",
): string {
  return renderToStaticMarkup(
    <MonthPicker
      locale={locale}
      selectedMonth={selectedMonth}
      currentMonth={currentMonth}
      kind={kind}
      view={view}
    />,
  );
}

function monthsNav(html: string): string {
  const match = /<nav\b[^>]*data-month-picker[^>]*>[\s\S]*?<\/nav>/.exec(html);
  return match?.[0] ?? "";
}

function monthLinks(html: string): { href: string; current: boolean; month: string; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*\sdata-month="(\d+)"[^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const tag = match[1] ?? "";
    const href = (/href="([^"]*)"/.exec(tag)?.[1] ?? "").replaceAll("&amp;", "&");
    const text = (match[3] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return { href, current: tag.includes('aria-current="true"'), month: match[2] ?? "", text };
  });
}

function namedHref(html: string, label: string): string {
  const match = new RegExp(`<a\\b([^>]*aria-label="${label}"[^>]*)>`).exec(html);
  return (/href="([^"]*)"/.exec(match?.[1] ?? "")?.[1] ?? "").replaceAll("&amp;", "&");
}

it("drops a month link, reorders the short names, or marks the wrong month current", () => {
  const english = monthLinks(monthsNav(markup("en", 4, 8, null)));
  expect(english.map((link) => link.month)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  expect(english.map((link) => link.text.replace("This month", "").trim())).toEqual(englishShort);
  expect(english.filter((link) => link.current).map((link) => link.month)).toEqual(["4"]);

  const arabic = monthLinks(monthsNav(markup("ar", 12, 3, null)));
  expect(arabic.map((link) => link.text.replace("هذا الشهر", "").trim())).toEqual(arabicShort);
  expect(arabic.filter((link) => link.current).map((link) => link.month)).toEqual(["12"]);
});

it("puts this month on the selected link, or on more than one link", () => {
  const apart = monthLinks(monthsNav(markup("en", 12, 8, null)));
  expect(apart.filter((link) => link.text.includes("This month")).map((link) => link.month)).toEqual(["8"]);
  expect(apart.filter((link) => link.text.includes("This month")).every((link) => link.current)).toBe(false);

  const together = monthLinks(monthsNav(markup("ar", 8, 8, null)));
  expect(together.filter((link) => link.text.includes("هذا الشهر")).map((link) => link.text)).toEqual([
    "أغسطس هذا الشهر",
  ]);
  expect(together.filter((link) => link.current).map((link) => link.month)).toEqual(["8"]);
});

it("steps previous and next into the neighbouring month, or fails to wrap December and January", () => {
  const january = monthsNav(markup("en", 1, 6, null));
  expect(namedHref(january, "Previous month")).toBe("/en/guide?month=12");
  expect(namedHref(january, "Next month")).toBe("/en/guide?month=2");
  expect(january).toContain('data-month-step="previous"');
  expect(january).toContain('data-month-step="next"');

  const december = monthsNav(markup("ar", 12, 6, null));
  expect(namedHref(december, "الشهر السابق")).toBe("/ar/guide?month=11");
  expect(namedHref(december, "الشهر التالي")).toBe("/ar/guide?month=1");
});

it("drops kind or view from a month, previous or next link", () => {
  const html = monthsNav(markup("en", 8, 8, "fruit", "chart"));
  const links = monthLinks(html);
  expect(links.map((link) => link.href)).toEqual([
    "/en/guide?month=1&kind=fruit&view=chart",
    "/en/guide?month=2&kind=fruit&view=chart",
    "/en/guide?month=3&kind=fruit&view=chart",
    "/en/guide?month=4&kind=fruit&view=chart",
    "/en/guide?month=5&kind=fruit&view=chart",
    "/en/guide?month=6&kind=fruit&view=chart",
    "/en/guide?month=7&kind=fruit&view=chart",
    "/en/guide?month=8&kind=fruit&view=chart",
    "/en/guide?month=9&kind=fruit&view=chart",
    "/en/guide?month=10&kind=fruit&view=chart",
    "/en/guide?month=11&kind=fruit&view=chart",
    "/en/guide?month=12&kind=fruit&view=chart",
  ]);
  expect(namedHref(html, "Previous month")).toBe("/en/guide?month=7&kind=fruit&view=chart");
  expect(namedHref(html, "Next month")).toBe("/en/guide?month=9&kind=fruit&view=chart");

  const arabic = monthsNav(markup("ar", 3, 3, "leafy", "chart"));
  expect(monthLinks(arabic).every((link) => link.href.includes("kind=leafy") && link.href.includes("view=chart"))).toBe(
    true,
  );
  expect(namedHref(arabic, "الشهر السابق")).toBe("/ar/guide?month=2&kind=leafy&view=chart");
  expect(namedHref(arabic, "الشهر التالي")).toBe("/ar/guide?month=4&kind=leafy&view=chart");
});
