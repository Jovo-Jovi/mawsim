import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import type { CalendarMonth, ProduceKind } from "../../domain";
import { MonthScroller } from "./index";

const englishNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const arabicNames = [
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

const arabicFruitHrefs = [
  "/ar/guide?month=1&kind=fruit",
  "/ar/guide?month=2&kind=fruit",
  "/ar/guide?month=3&kind=fruit",
  "/ar/guide?month=4&kind=fruit",
  "/ar/guide?month=5&kind=fruit",
  "/ar/guide?month=6&kind=fruit",
  "/ar/guide?month=7&kind=fruit",
  "/ar/guide?month=8&kind=fruit",
  "/ar/guide?month=9&kind=fruit",
  "/ar/guide?month=10&kind=fruit",
  "/ar/guide?month=11&kind=fruit",
  "/ar/guide?month=12&kind=fruit",
];

const arabicOpenHrefs = [
  "/ar/guide?month=1",
  "/ar/guide?month=2",
  "/ar/guide?month=3",
  "/ar/guide?month=4",
  "/ar/guide?month=5",
  "/ar/guide?month=6",
  "/ar/guide?month=7",
  "/ar/guide?month=8",
  "/ar/guide?month=9",
  "/ar/guide?month=10",
  "/ar/guide?month=11",
  "/ar/guide?month=12",
];

function markup(locale: Locale, selectedMonth: CalendarMonth, currentMonth: CalendarMonth, kind: ProduceKind | null): string {
  return renderToStaticMarkup(
    <MonthScroller locale={locale} selectedMonth={selectedMonth} currentMonth={currentMonth} kind={kind} />,
  );
}

function monthsNav(html: string): string {
  const match = /<nav\b[^>]*data-month-scroller="true"[^>]*>[\s\S]*?<\/nav>/.exec(html);
  return match?.[0] ?? "";
}

function anchors(html: string): { href: string; current: boolean; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const tag = match[1] ?? "";
    const href = (/href="([^"]*)"/.exec(tag)?.[1] ?? "").replaceAll("&amp;", "&");
    const text = (match[2] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    return { href, current: tag.includes('aria-current="true"'), text };
  });
}

it("reorders the twelve months or translates a name", () => {
  const english = anchors(monthsNav(markup("en", 12, 8, null)));
  expect(english.map((anchor) => anchor.text.replace("This month", "").trim())).toEqual(englishNames);

  const arabic = anchors(monthsNav(markup("ar", 12, 8, null)));
  expect(arabic.map((anchor) => anchor.text.replace("هذا الشهر", "").trim())).toEqual(arabicNames);
});

it("marks every month current, or marks a month that is not selected", () => {
  const english = anchors(monthsNav(markup("en", 12, 8, null)));
  expect(english.filter((anchor) => anchor.current).map((anchor) => anchor.text)).toEqual(["December"]);

  const arabic = anchors(monthsNav(markup("ar", 3, 8, "fruit")));
  expect(arabic.filter((anchor) => anchor.current).map((anchor) => anchor.text.replace("هذا الشهر", "").trim())).toEqual(["مارس"]);
});

it("drops the kind from a month href, or points a month somewhere else", () => {
  const fruit = anchors(monthsNav(markup("ar", 12, 8, "fruit")));
  expect(fruit.map((anchor) => anchor.href)).toEqual(arabicFruitHrefs);

  const open = anchors(monthsNav(markup("ar", 8, 8, null)));
  expect(open.map((anchor) => anchor.href)).toEqual(arabicOpenHrefs);
});

it("puts this month on the selected link, or on more than one link", () => {
  const apart = anchors(monthsNav(markup("en", 12, 8, null)));
  expect(apart.filter((anchor) => anchor.text.includes("This month")).map((anchor) => anchor.text)).toEqual([
    "August This month",
  ]);
  expect(apart.filter((anchor) => anchor.text.includes("This month")).every((anchor) => anchor.current)).toBe(false);

  const together = anchors(monthsNav(markup("ar", 8, 8, null)));
  expect(together.filter((anchor) => anchor.text.includes("هذا الشهر")).map((anchor) => anchor.text)).toEqual([
    "أغسطس هذا الشهر",
  ]);
  expect(together.filter((anchor) => anchor.current).map((anchor) => anchor.text)).toEqual(["أغسطس هذا الشهر"]);
});

it("leaves the months nav unlabelled or drops data-month-scroller", () => {
  const english = monthsNav(markup("en", 1, 1, null));
  expect(english.startsWith('<nav')).toBe(true);
  expect(english).toContain('aria-label="Months"');
  expect(english).toContain('data-month-scroller="true"');

  const arabic = monthsNav(markup("ar", 1, 1, null));
  expect(arabic).toContain('aria-label="الشهور"');
  expect(arabic).toContain('data-month-scroller="true"');
});
