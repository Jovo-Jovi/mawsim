import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const localeState = vi.hoisted(() => ({ value: "ar" }));

vi.mock("next/cache", () => ({
  cacheLife: () => undefined,
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));

vi.mock("next/root-params", () => ({
  locale: () => Promise.resolve(localeState.value),
}));

import HomePage from "./page";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function heading(html: string): string {
  return /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
}

function slugs(html: string): string[] {
  return [...html.matchAll(/href="\/(?:ar|en)\/produce\/([a-z-]+)"/g)].map((match) => match[1] ?? "");
}

const augustSlugs = ["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"];

it("writes another month into the heading, adds a second h1, or fills the grid with produce outside that month", async () => {
  localeState.value = "en";
  const english = renderToStaticMarkup(await HomePage());
  expect(english.match(/<h1\b/g)?.length).toBe(1);
  expect(heading(english).replace(/<[^>]+>/g, "")).toBe("What is fresh in Egypt in August");
  expect(/<span\b[^>]*>August<\/span>/.test(heading(english))).toBe(true);
  expect(slugs(english)).toEqual(augustSlugs);
  expect(english).toContain('href="/en/guide?month=8"');
  expect(english).toContain("In season this month: 7");
  expect(english).toContain("Sample data for a test product — not farming or nutrition advice.");

  localeState.value = "ar";
  const arabic = renderToStaticMarkup(await HomePage());
  expect(arabic.match(/<h1\b/g)?.length).toBe(1);
  expect(heading(arabic).replace(/<[^>]+>/g, "")).toBe("الطازج في مصر في أغسطس");
  expect(/<span\b[^>]*>أغسطس<\/span>/.test(heading(arabic))).toBe(true);
  expect(slugs(arabic)).toEqual(augustSlugs);
  expect(arabic).toContain('href="/ar/guide?month=8"');
  expect(arabic).toContain("في موسمه هذا الشهر: 7");
  expect(arabic).toContain("بيانات تجريبية لمنتج قيد التجربة — وليست نصيحة زراعية أو غذائية.");
});

function elementByAttr(html: string, attr: string): string {
  const attrAt = html.indexOf(attr);
  if (attrAt < 0) return "";
  const start = html.lastIndexOf("<div", attrAt);
  let depth = 0;
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = start;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return html.slice(start, tags.lastIndex);
    } else {
      depth += 1;
    }
  }
  return "";
}

it("leaves the hero or the in-season heading without a weave, or paints that weave behind a card or the sample-data notice", async () => {
  localeState.value = "en";
  const english = renderToStaticMarkup(await HomePage());
  const hero = elementByAttr(english, 'data-texture-band="hero"');
  const heading = elementByAttr(english, 'data-texture-band="heading"');
  expect(hero).toContain("<h1");
  expect(hero).toContain("<pattern");
  expect(hero).not.toContain("<h2");
  expect(hero).not.toContain("/produce/");
  expect(heading).toContain("<h2");
  expect(heading).toContain("In season this month");
  expect(heading).toContain("<pattern");
  expect(heading).not.toContain("/produce/");
  expect(heading).not.toContain("Sample data");
  expect(english.match(/<pattern\b/g)?.length).toBe(2);
  expect(english.slice(english.indexOf("<h2"))).not.toContain("<pattern");

  localeState.value = "ar";
  const arabic = renderToStaticMarkup(await HomePage());
  const arabicHeading = elementByAttr(arabic, 'data-texture-band="heading"');
  expect(elementByAttr(arabic, 'data-texture-band="hero"')).toContain("<pattern");
  expect(arabicHeading).toContain("في موسمه هذا الشهر");
  expect(arabicHeading).toContain("<pattern");
  expect(arabicHeading).not.toContain("/produce/");
  expect(arabic.match(/<pattern\b/g)?.length).toBe(2);
});
