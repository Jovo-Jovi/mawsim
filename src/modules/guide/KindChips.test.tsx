import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import type { ProduceKind } from "../../domain";
import type { GuideView } from "./guide-query";
import { KindChips } from "./index";

function markup(locale: Locale, kind: ProduceKind | null, view: GuideView = "list"): string {
  return renderToStaticMarkup(<KindChips locale={locale} selectedMonth={8} kind={kind} view={view} />);
}

function kindsNav(html: string, label: string): string {
  const match = new RegExp(`<nav\\b[^>]*aria-label="${label}"[^>]*>[\\s\\S]*?</nav>`).exec(html);
  return match?.[0] ?? "";
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => (match[1] ?? "").replaceAll("&amp;", "&"));
}

function labels(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)].map((match) => match[1] ?? "");
}

function currentLabels(html: string): string[] {
  return [...html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)]
    .filter((match) => (match[1] ?? "").includes('aria-current="true"'))
    .map((match) => match[2] ?? "");
}

const englishHrefs = [
  "/en/guide?month=8",
  "/en/guide?month=8&kind=fruit",
  "/en/guide?month=8&kind=vegetable",
  "/en/guide?month=8&kind=leafy",
];

const arabicHrefs = [
  "/ar/guide?month=8",
  "/ar/guide?month=8&kind=fruit",
  "/ar/guide?month=8&kind=vegetable",
  "/ar/guide?month=8&kind=leafy",
];

it("reorders the kind links, drops month=8, or marks every chip current", () => {
  const english = kindsNav(markup("en", null), "Kinds");
  expect(labels(english)).toEqual(["All", "Fruit", "Vegetables", "Leafy greens"]);
  expect(hrefs(english)).toEqual(englishHrefs);
  expect(hrefs(english).every((href) => href.includes("month=8"))).toBe(true);
  expect(currentLabels(english)).toEqual(["All"]);

  const arabic = kindsNav(markup("ar", null), "الأنواع");
  expect(labels(arabic)).toEqual(["الكل", "فاكهة", "خضار", "ورقيات"]);
  expect(hrefs(arabic)).toEqual(arabicHrefs);
  expect(currentLabels(arabic)).toEqual(["الكل"]);
});

it("marks All current when a kind is selected, or points a chip at another month", () => {
  const fruit = kindsNav(markup("en", "fruit"), "Kinds");
  expect(hrefs(fruit)).toEqual(englishHrefs);
  expect(currentLabels(fruit)).toEqual(["Fruit"]);

  const leafy = kindsNav(markup("ar", "leafy"), "الأنواع");
  expect(hrefs(leafy)).toEqual(arabicHrefs);
  expect(currentLabels(leafy)).toEqual(["ورقيات"]);
});

it("drops view=chart from a kind link", () => {
  const english = kindsNav(markup("en", "fruit", "chart"), "Kinds");
  expect(hrefs(english)).toEqual([
    "/en/guide?month=8&view=chart",
    "/en/guide?month=8&kind=fruit&view=chart",
    "/en/guide?month=8&kind=vegetable&view=chart",
    "/en/guide?month=8&kind=leafy&view=chart",
  ]);
  expect(currentLabels(english)).toEqual(["Fruit"]);

  const arabic = kindsNav(markup("ar", null, "chart"), "الأنواع");
  expect(hrefs(arabic)).toEqual([
    "/ar/guide?month=8&view=chart",
    "/ar/guide?month=8&kind=fruit&view=chart",
    "/ar/guide?month=8&kind=vegetable&view=chart",
    "/ar/guide?month=8&kind=leafy&view=chart",
  ]);
});
