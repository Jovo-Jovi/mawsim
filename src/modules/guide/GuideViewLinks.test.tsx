import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import type { CalendarMonth, ProduceKind } from "../../domain";
import type { GuideView } from "./guide-query";
import { GuideViewLinks } from "./index";

function markup(
  locale: Locale,
  kind: ProduceKind | null,
  view: GuideView,
  selectedMonth: CalendarMonth = 8,
): string {
  return renderToStaticMarkup(
    <GuideViewLinks locale={locale} selectedMonth={selectedMonth} kind={kind} view={view} />,
  );
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => (match[1] ?? "").replaceAll("&amp;", "&"));
}

function currentLabels(html: string): string[] {
  return [...html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)]
    .filter((match) => (match[1] ?? "").includes('aria-current="true"'))
    .map((match) => match[2] ?? "");
}

it("drops a view link, marks both views current, or swaps the two names", () => {
  const english = markup("en", null, "list");
  expect(english).toContain('aria-label="Views"');
  expect(hrefs(english)).toEqual(["/en/guide?month=8", "/en/guide?month=8&view=chart"]);
  expect(currentLabels(english)).toEqual(["Cards"]);

  const arabic = markup("ar", null, "chart");
  expect(arabic).toContain('aria-label="طرق العرض"');
  expect(hrefs(arabic)).toEqual(["/ar/guide?month=8", "/ar/guide?month=8&view=chart"]);
  expect(currentLabels(arabic)).toEqual(["مخطط السنة"]);
});

it("drops month or kind from a view link, or writes list into the query", () => {
  const english = markup("en", "fruit", "chart", 3);
  expect(hrefs(english)).toEqual([
    "/en/guide?month=3&kind=fruit",
    "/en/guide?month=3&kind=fruit&view=chart",
  ]);
  expect(english).not.toContain("view=list");
  expect(currentLabels(english)).toEqual(["Year chart"]);

  const arabic = markup("ar", "leafy", "list", 12);
  expect(hrefs(arabic)).toEqual([
    "/ar/guide?month=12&kind=leafy",
    "/ar/guide?month=12&kind=leafy&view=chart",
  ]);
  expect(arabic).not.toContain("view=list");
  expect(currentLabels(arabic)).toEqual(["البطاقات"]);
});
