import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { filterByKind, type CalendarMonth, type ProduceKind } from "../../domain";
import { inSeasonIn } from "@/modules/produce";
import { CardGrid } from "./index";

function markup(
  locale: Locale,
  selectedMonth: CalendarMonth,
  kind: ProduceKind | null,
  currentMonth: CalendarMonth,
): string {
  return renderToStaticMarkup(
    <CardGrid
      produce={filterByKind(inSeasonIn(selectedMonth), kind)}
      locale={locale}
      currentMonth={currentMonth}
      selectedMonth={selectedMonth}
      kind={kind}
    />,
  );
}

function slugs(html: string): string[] {
  return [...html.matchAll(/href="\/(?:ar|en)\/produce\/([a-z-]+)"/g)].map((match) => match[1] ?? "");
}

function guideHrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)]
    .map((match) => (match[1] ?? "").replaceAll("&amp;", "&"))
    .filter((href) => href.includes("/guide"));
}

it("drops a produce row or reorders the August grid", () => {
  const english = markup("en", 8, null, 11);
  expect(slugs(english)).toEqual(["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"]);
  expect(english).not.toContain("Nothing of this kind is in season");

  const arabic = markup("ar", 8, null, 11);
  expect(slugs(arabic)).toEqual(["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"]);
  expect(arabic).not.toContain("لا شيء من هذا النوع في موسمه");
});

it("keeps a vegetable or a leafy row in the August fruit grid", () => {
  const html = markup("en", 8, "fruit", 11);
  expect(slugs(html)).toEqual(["mango", "watermelon", "guava", "dates"]);
  expect(html).not.toContain("/produce/tomato");
  expect(html).not.toContain("/produce/okra");
  expect(html).not.toContain("/produce/molokhia");
});

it("invents a January leafy row, or drops a recovery link when this month is November", () => {
  const english = markup("en", 1, "leafy", 11);
  expect(slugs(english)).toEqual([]);
  expect(english).toContain("Nothing of this kind is in season in January.");
  expect(english).toContain("Show all kinds");
  expect(english).toContain("Show this month");
  expect(guideHrefs(english)).toEqual(["/en/guide?month=1", "/en/guide?kind=leafy"]);

  const arabic = markup("ar", 1, "leafy", 11);
  expect(slugs(arabic)).toEqual([]);
  expect(arabic).toContain("لا شيء من هذا النوع في موسمه في يناير.");
  expect(arabic).toContain("عرض كل الأنواع");
  expect(arabic).toContain("عرض هذا الشهر");
  expect(guideHrefs(arabic)).toEqual(["/ar/guide?month=1", "/ar/guide?kind=leafy"]);
});

it("shows the this-month link when the shown month is this month", () => {
  const english = markup("en", 1, "leafy", 1);
  expect(english).toContain("Nothing of this kind is in season in January.");
  expect(english).toContain("Show all kinds");
  expect(english).not.toContain("Show this month");
  expect(guideHrefs(english)).toEqual(["/en/guide?month=1"]);

  const arabic = markup("ar", 1, "leafy", 1);
  expect(arabic).toContain("لا شيء من هذا النوع في موسمه في يناير.");
  expect(arabic).not.toContain("عرض هذا الشهر");
  expect(guideHrefs(arabic)).toEqual(["/ar/guide?month=1"]);
});
