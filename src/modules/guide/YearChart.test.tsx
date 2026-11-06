import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { otherLocale } from "@/i18n/href";
import { calendarMonths, filterByKind, isInSeason, type CalendarMonth, type ProduceKind } from "../../domain";
import { listProduce, seasonSentence, type Produce } from "@/modules/produce";
import { YearChart } from "./index";

const allTen = [
  "tomato",
  "mango",
  "orange",
  "strawberry",
  "watermelon",
  "guava",
  "pomegranate",
  "okra",
  "molokhia",
  "dates",
] as const;

const fruitSeven = ["mango", "orange", "strawberry", "watermelon", "guava", "pomegranate", "dates"] as const;

function markup(
  produce: readonly Produce[],
  locale: Locale,
  selectedMonth: CalendarMonth,
  currentMonth: CalendarMonth,
  kind: ProduceKind | null,
): string {
  return renderToStaticMarkup(
    <YearChart
      produce={produce}
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

function rowHtml(html: string, slug: string): string {
  const marker = `/produce/${slug}"`;
  const at = html.indexOf(marker);
  const start = html.lastIndexOf("<li", at);
  const end = html.indexOf("</li>", at);
  return html.slice(start, end);
}

function spanTags(fragment: string): string[] {
  return [...fragment.matchAll(/<span\b[^>]*>/g)].map((match) => match[0]);
}

function monthOf(tag: string): number {
  return Number(/data-month="(\d+)"/.exec(tag)?.[1] ?? "0");
}

function langAttribute(locale: Locale): string {
  return `lang="${locale}"`;
}

it("drops a produce row, or shows only the in-season subset when the kind is all", () => {
  const catalogue = listProduce();
  expect(catalogue).toHaveLength(10);

  const english = markup(catalogue, "en", 8, 8, null);
  expect(slugs(english)).toEqual([...allTen]);
  expect(english).toContain('aria-label="Seasons across the year"');
  expect(english).not.toContain("data-reveal-item");

  const fruit = markup(filterByKind(catalogue, "fruit"), "ar", 8, 8, "fruit");
  expect(slugs(fruit)).toEqual([...fruitSeven]);
  expect(fruit).toContain('aria-label="المواسم على مدار السنة"');
});

it("lights a cell that is out of season, or leaves an in-season cell empty", () => {
  const catalogue = listProduce();
  for (const locale of ["en", "ar"] as const) {
    const html = markup(catalogue, locale, 8, 3, null);
    for (const row of catalogue) {
      const cells = spanTags(rowHtml(html, row.slug)).filter((tag) => tag.includes("data-in="));
      expect(cells.map(monthOf)).toEqual([...calendarMonths]);
      for (const tag of cells) {
        const calendarMonth = monthOf(tag) as CalendarMonth;
        const lit = tag.includes('data-in="true"');
        expect(lit).toBe(isInSeason(row.months, calendarMonth));
      }
    }
  }

  const orange = spanTags(rowHtml(markup(catalogue, "en", 8, 3, null), "orange")).filter((tag) =>
    tag.includes("data-in="),
  );
  expect(orange.map((tag) => tag.includes('data-in="true"'))).toEqual([
    true,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
  ]);
});

it("puts the selected column or this month's tick on another cell", () => {
  const html = markup(listProduce(), "en", 8, 3, null);
  const headStart = html.indexOf('data-chart-head=""');
  const headEnd = html.indexOf("<ol");
  const head = spanTags(html.slice(headStart, headEnd));
  expect(head.map(monthOf)).toEqual([...calendarMonths]);
  expect(head.filter((tag) => tag.includes('data-selected="true"')).map(monthOf)).toEqual([8]);
  expect(head.filter((tag) => tag.includes('data-tick="true"')).map(monthOf)).toEqual([3]);
  const headNames = [...html.slice(headStart, headEnd).matchAll(/<span\b[^>]*>([^<]*)<\/span>/g)].map(
    (match) => match[1] ?? "",
  );
  expect(headNames).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);

  const tomato = spanTags(rowHtml(html, "tomato")).filter((tag) => tag.includes("data-in="));
  expect(tomato.filter((tag) => tag.includes('data-selected="true"')).map(monthOf)).toEqual([8]);
  expect(tomato.filter((tag) => tag.includes('data-tick="true"')).map(monthOf)).toEqual([3]);
});

it("splits a short month name, or lists the header out of January-to-December order", () => {
  const catalogue = listProduce();
  const wholeNames = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
  } as const;
  for (const locale of ["en", "ar"] as const) {
    const html = markup(catalogue, locale, 4, 11, null);
    const headStart = html.indexOf('data-chart-head=""');
    const headEnd = html.indexOf("<ol");
    const head = html.slice(headStart, headEnd);
    const labels = [...head.matchAll(/<span\b[^>]*>([^<]*)<\/span>/g)].map((match) => match[1] ?? "");
    expect(labels).toEqual([...wholeNames[locale]]);
    expect(head).not.toContain("<br");
  }
});

it("drops a season sentence, or gives the counter-name the page language", () => {
  const catalogue = listProduce();
  const english = markup(catalogue, "en", 8, 8, null);
  const arabic = markup(catalogue, "ar", 8, 8, null);
  for (const row of catalogue) {
    const englishRow = rowHtml(english, row.slug);
    const arabicRow = rowHtml(arabic, row.slug);
    expect(englishRow).toContain(seasonSentence(row, "en"));
    expect(arabicRow).toContain(seasonSentence(row, "ar"));
    expect(englishRow).toContain(langAttribute(otherLocale("en")));
    expect(englishRow).toContain(row.ar);
    expect(arabicRow).toContain(langAttribute(otherLocale("ar")));
    expect(arabicRow).toContain(row.en);
    expect(englishRow).not.toContain(langAttribute("en"));
    expect(arabicRow).not.toContain(langAttribute("ar"));
  }
});

it("drops view=chart from an empty-chart link, or shows this month when it is already showing", () => {
  const away = markup([], "en", 1, 11, "leafy");
  expect(away).toContain("Nothing of this kind is in season in January.");
  expect(away).toContain("Show all kinds");
  expect(away).toContain("Show this month");
  expect(guideHrefs(away)).toEqual(["/en/guide?month=1&view=chart", "/en/guide?kind=leafy&view=chart"]);
  expect(away).not.toContain("/produce/");

  const here = markup([], "ar", 1, 1, "leafy");
  expect(here).toContain("لا شيء من هذا النوع في موسمه في يناير.");
  expect(here).not.toContain("عرض هذا الشهر");
  expect(guideHrefs(here)).toEqual(["/ar/guide?month=1&view=chart"]);
});
