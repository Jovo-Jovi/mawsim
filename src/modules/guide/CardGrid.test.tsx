import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { inSeasonIn, listProduce } from "@/modules/produce";
import {
  calendarMonths,
  filterByKind,
  isInSeason,
  produceKinds,
  type CalendarMonth,
  type ProduceKind,
} from "../../domain";
import { CardGrid } from "./index";

function markup(
  locale: Locale,
  selectedMonth: CalendarMonth,
  kind: ProduceKind | null,
  currentMonth: CalendarMonth,
): string {
  return renderToStaticMarkup(
    <CardGrid
      produce={listProduce()}
      locale={locale}
      currentMonth={currentMonth}
      selectedMonth={selectedMonth}
      kind={kind}
    />,
  );
}

type CardMarkup = { flipId: string; hidden: boolean; reveal: boolean; slug: string };

function cards(html: string): CardMarkup[] {
  return [...html.matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].map((match) => {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    return {
      flipId: /data-flip-id="([^"]*)"/.exec(attrs)?.[1] ?? "",
      hidden: /(?:^|\s)hidden(?:[\s=]|$)/.test(attrs),
      reveal: attrs.includes("data-reveal-item"),
      slug: /href="\/(?:ar|en)\/produce\/([a-z-]+)"/.exec(body)?.[1] ?? "",
    };
  });
}

function visibleSlugs(html: string): string[] {
  return cards(html).flatMap((card) => (card.hidden ? [] : [card.slug]));
}

function guideHrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)]
    .map((match) => (match[1] ?? "").replaceAll("&amp;", "&"))
    .filter((href) => href.includes("/guide"));
}

it("drops a produce row or reorders the August grid", () => {
  const english = markup("en", 8, null, 11);
  expect(cards(english)).toHaveLength(10);
  expect(cards(english).map((card) => card.flipId)).toEqual(listProduce().map((row) => row.slug));
  expect(visibleSlugs(english)).toEqual(["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"]);
  expect(english).not.toContain("Nothing of this kind is in season");

  const arabic = markup("ar", 8, null, 11);
  expect(cards(arabic)).toHaveLength(10);
  expect(visibleSlugs(arabic)).toEqual(["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"]);
  expect(arabic).not.toContain("لا شيء من هذا النوع في موسمه");
});

it("keeps a vegetable or a leafy row visible in the August fruit grid", () => {
  const html = markup("en", 8, "fruit", 11);
  expect(visibleSlugs(html)).toEqual(["mango", "watermelon", "guava", "dates"]);
  for (const slug of ["tomato", "okra", "molokhia"]) {
    const card = cards(html).find((entry) => entry.flipId === slug);
    expect(card?.hidden, slug).toBe(true);
    expect(card?.reveal, slug).toBe(false);
    expect(card?.slug, slug).toBe(slug);
  }
});

it("hides the wrong slugs for a month or a kind, or marks a hidden card for reveal", () => {
  for (const month of calendarMonths) {
    expect(inSeasonIn(month).map((row) => row.slug)).toEqual(
      listProduce()
        .filter((row) => isInSeason(row.months, month))
        .map((row) => row.slug),
    );
    for (const kind of [null, ...produceKinds]) {
      const html = markup("en", month, kind, 11);
      const rendered = cards(html);
      expect(rendered, `month ${month} ${kind ?? "all"}`).toHaveLength(10);
      expect(rendered.map((card) => card.flipId)).toEqual(listProduce().map((row) => row.slug));
      expect(visibleSlugs(html)).toEqual(filterByKind(inSeasonIn(month), kind).map((row) => row.slug));
      for (const card of rendered) {
        expect(card.reveal, card.flipId).toBe(!card.hidden);
        expect(card.flipId).toBe(card.slug);
      }
    }
  }
});

it("invents a January leafy row, or drops a recovery link when this month is November", () => {
  const english = markup("en", 1, "leafy", 11);
  expect(cards(english)).toHaveLength(10);
  expect(visibleSlugs(english)).toEqual([]);
  expect(cards(english).every((card) => card.hidden && !card.reveal)).toBe(true);
  expect(english).toContain("Nothing of this kind is in season in January.");
  expect(english).toContain("Show all kinds");
  expect(english).toContain("Show this month");
  expect(guideHrefs(english)).toEqual(["/en/guide?month=1", "/en/guide?kind=leafy"]);

  const arabic = markup("ar", 1, "leafy", 11);
  expect(visibleSlugs(arabic)).toEqual([]);
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
