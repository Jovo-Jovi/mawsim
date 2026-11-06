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

import { generateMetadata, default as GuidePage } from "./page";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function mainHtml(html: string): string {
  return html.split("<footer")[0] ?? html;
}

function heading(html: string): string {
  return /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
}

function slugs(html: string): string[] {
  return [...html.matchAll(/href="\/(?:ar|en)\/produce\/([a-z-]+)"/g)].map((match) => match[1] ?? "");
}

function labelledNav(html: string, label: string): string {
  return new RegExp(`<nav\\b[^>]*aria-label="${label}"[^>]*>[\\s\\S]*?</nav>`).exec(html)?.[0] ?? "";
}

function chipHrefs(html: string, label: string): string[] {
  const nav = labelledNav(html, label);
  return [...nav.matchAll(/href="([^"]*)"/g)].map((match) => (match[1] ?? "").replaceAll("&amp;", "&"));
}

const TEXTURE_FILE = "/photos/texture/texture.webp";

function imageFile(tag: string): string {
  const src = (/src="([^"]*)"/.exec(tag)?.[1] ?? "").replaceAll("&amp;", "&");
  return new URL(src, "http://localhost").searchParams.get("url") ?? "";
}

function filesWithAlt(html: string, alt: string): string[] {
  return [...html.matchAll(/<img\b[^>]*>/g)].flatMap((match) => {
    const tag = match[0];
    const found = /alt="([^"]*)"/.exec(tag)?.[1];
    if (found !== alt) return [];
    return [imageFile(tag)];
  });
}

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

function anchors(html: string): { href: string; current: string | null; lang: string | null }[] {
  return [...html.matchAll(/<a\b[^>]*>/g)].map((match) => {
    const tag = match[0];
    const href = (/href="([^"]*)"/.exec(tag)?.[1] ?? "").replaceAll("&amp;", "&");
    const current = /aria-current="([^"]*)"/.exec(tag)?.[1] ?? null;
    const lang = /(?:^|\s)lang="([^"]*)"/.exec(tag)?.[1] ?? null;
    return { href, current, lang };
  });
}

const augustAll = ["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"];

async function render(query: {
  month?: string | string[];
  kind?: string | string[];
  view?: string | string[];
}): Promise<string> {
  return renderToStaticMarkup(await GuidePage({ searchParams: Promise.resolve(query) }));
}

it("leaves the guide header without its texture photograph, or paints that photograph behind a card or the sample-data notice", async () => {
  localeState.value = "en";
  const english = await render({ month: "8" });
  const band = elementByAttr(english, 'data-texture-band="guide"');
  expect(band).toContain("<h1");
  expect(band).toContain('aria-label="Months"');
  expect(band).toContain('aria-label="Kinds"');
  expect(filesWithAlt(band, "")).toEqual([TEXTURE_FILE]);
  expect(band).not.toContain("<pattern");
  expect(band).not.toContain("/produce/");
  expect(band).not.toContain("Sample data");
  expect(english.match(/<pattern\b/g) ?? []).toHaveLength(0);
  expect(filesWithAlt(english, "")).toEqual([TEXTURE_FILE]);
  expect(english.slice(english.indexOf("<h1"))).not.toContain("<pattern");
  expect(filesWithAlt(english.slice(english.indexOf("<h1")), "")).toEqual([]);

  localeState.value = "ar";
  const arabic = await render({ month: "8" });
  const arabicBand = elementByAttr(arabic, 'data-texture-band="guide"');
  expect(arabicBand).toContain('aria-label="الشهور"');
  expect(arabicBand).toContain('aria-label="الأنواع"');
  expect(filesWithAlt(arabicBand, "")).toEqual([TEXTURE_FILE]);
  expect(arabicBand).not.toContain("<pattern");
  expect(arabicBand).not.toContain("/produce/");
  expect(arabic.match(/<pattern\b/g) ?? []).toHaveLength(0);
  expect(filesWithAlt(arabic, "")).toEqual([TEXTURE_FILE]);
});

it("writes the wrong month into the heading or adds a second h1", async () => {
  localeState.value = "en";
  const english = await render({ month: "8" });
  expect(english.match(/<h1\b/g)?.length).toBe(1);
  expect(heading(english)).toBe("What is in season in August");
  expect(mainHtml(english)).toContain("Sample data for a test product — not farming or nutrition advice.");
  expect(chipHrefs(english, "Kinds")).toEqual([
    "/en/guide?month=8",
    "/en/guide?month=8&kind=fruit",
    "/en/guide?month=8&kind=vegetable",
    "/en/guide?month=8&kind=leafy",
  ]);
  expect(slugs(english)).toEqual(augustAll);

  localeState.value = "ar";
  const arabic = await render({ month: "8" });
  expect(arabic.match(/<h1\b/g)?.length).toBe(1);
  expect(heading(arabic)).toBe("ما الذي في موسمه في أغسطس");
  expect(mainHtml(arabic)).toContain("بيانات تجريبية لمنتج قيد التجربة — وليست نصيحة زراعية أو غذائية.");
  expect(slugs(arabic)).toEqual(augustAll);
});

it("ignores a valid month or a valid kind and shows this month's full grid", async () => {
  localeState.value = "en";
  const january = await render({ month: "1" });
  expect(heading(january)).toBe("What is in season in January");
  expect(slugs(january)).toEqual(["tomato", "orange", "strawberry"]);
  expect(chipHrefs(january, "Kinds").every((href) => href.includes("month=1"))).toBe(true);

  const fruit = await render({ month: "8", kind: "fruit" });
  expect(heading(fruit)).toBe("What is in season in August");
  expect(slugs(fruit)).toEqual(["mango", "watermelon", "guava", "dates"]);
});

it("reflects a junk query or shows another month's rows", async () => {
  localeState.value = "en";
  const queries: { month?: string | string[]; kind?: string | string[] }[] = [
    { month: "13" },
    { month: ["8", "9"] },
    { kind: "nuts" },
    {},
  ];
  for (const query of queries) {
    const html = await render(query);
    expect(heading(html)).toBe("What is in season in August");
    expect(slugs(html)).toEqual(augustAll);
    expect(html).not.toContain("month=13");
    expect(html).not.toContain("nuts");
    expect(html).not.toContain("8,9");
  }
});

it("sets a generic title, adds a canonical, or reads the query into the metadata", async () => {
  localeState.value = "en";
  const english = await generateMetadata();
  expect(english.title).toBe("Guide \u2014 Mawsim");
  expect(english.description).toBe("What is in season in Egypt, month by month.");
  expect(english.alternates).toEqual({ languages: { ar: "/ar/guide" } });
  expect(JSON.stringify(english)).not.toContain("canonical");
  expect(JSON.stringify(english)).not.toContain("metadataBase");

  localeState.value = "ar";
  const arabic = await generateMetadata();
  expect(arabic.title).toBe("الدليل \u2014 موسم");
  expect(arabic.description).toBe("ما الذي في موسمه في مصر، شهرًا بشهر.");
  expect(arabic.alternates).toEqual({ languages: { en: "/en/guide" } });
  expect(JSON.stringify(arabic)).not.toContain("canonical");
  expect(JSON.stringify(arabic)).not.toContain("metadataBase");
});

it("drops aria-current from the guide link or marks Home as the current page", async () => {
  localeState.value = "ar";
  const arabic = anchors(await render({ month: "8" })).filter((anchor) => anchor.current === "page");
  expect(arabic.map((anchor) => anchor.href)).toEqual(["/ar/guide"]);

  localeState.value = "en";
  const english = anchors(await render({ month: "8" })).filter((anchor) => anchor.current === "page");
  expect(english.map((anchor) => anchor.href)).toEqual(["/en/guide"]);
});

it("drops the parsed month or kind from a language link", async () => {
  localeState.value = "ar";
  const html = await render({ month: "8", kind: "fruit" });
  const links = anchors(html).filter((anchor) => anchor.lang === "en").map((anchor) => anchor.href);
  expect(links).toEqual(["/en/guide?month=8&kind=fruit", "/en/guide?month=8&kind=fruit"]);
});

it("places Kinds before Months, or leaves a junk month on the scroller", async () => {
  localeState.value = "en";
  const english = await render({ month: "12" });
  const monthsAt = english.indexOf('aria-label="Months"');
  const kindsAt = english.indexOf('aria-label="Kinds"');
  expect(monthsAt).toBeGreaterThan(english.indexOf("<h1"));
  expect(kindsAt).toBeGreaterThan(monthsAt);

  localeState.value = "ar";
  const arabic = await render({ month: "3" });
  const arabicMonths = arabic.indexOf('aria-label="الشهور"');
  expect(arabicMonths).toBeGreaterThan(arabic.indexOf("<h1"));
  expect(arabic.indexOf('aria-label="الأنواع"')).toBeGreaterThan(arabicMonths);

  localeState.value = "en";
  const junk: { month?: string | string[] }[] = [{ month: "13" }, { month: ["8", "9"] }];
  for (const query of junk) {
    const html = await render(query);
    const nav = labelledNav(html, "Months");
    const current = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter((match) =>
      (match[1] ?? "").includes('aria-current="true"'),
    );
    expect(current).toHaveLength(1);
    expect(current[0]?.[1] ?? "").toContain('data-month="8"');
    expect((current[0]?.[2] ?? "").replace(/<[^>]+>/g, "").replace("This month", "").trim()).toBe("Aug");
    expect(html).not.toContain("month=13");
    expect(html).not.toContain("nuts");
    expect(html).not.toContain("8,9");
  }
});

it("drops view=chart from a month, kind or language link", async () => {
  localeState.value = "ar";
  const html = await render({ month: "8", kind: "fruit", view: "chart" });
  const links = anchors(html).filter((anchor) => anchor.lang === "en").map((anchor) => anchor.href);
  expect(links).toEqual([
    "/en/guide?month=8&kind=fruit&view=chart",
    "/en/guide?month=8&kind=fruit&view=chart",
  ]);
  expect(chipHrefs(html, "الأنواع")).toEqual([
    "/ar/guide?month=8&view=chart",
    "/ar/guide?month=8&kind=fruit&view=chart",
    "/ar/guide?month=8&kind=vegetable&view=chart",
    "/ar/guide?month=8&kind=leafy&view=chart",
  ]);
  expect(chipHrefs(html, "الشهور")).toContain("/ar/guide?month=9&kind=fruit&view=chart");
});

it("keeps a bare guide or a junk query on the language links", async () => {
  localeState.value = "ar";
  const bare = anchors(await render({})).filter((anchor) => anchor.lang === "en").map((anchor) => anchor.href);
  expect(bare).toEqual(["/en/guide", "/en/guide"]);

  const junkHtml = await render({ month: "13", kind: "nuts" });
  const junk = anchors(junkHtml).filter((anchor) => anchor.lang === "en").map((anchor) => anchor.href);
  expect(junk).toEqual(["/en/guide", "/en/guide"]);
  expect(junkHtml).not.toContain("month=13");
  expect(junkHtml).not.toContain("nuts");

  const paddedHtml = await render({ month: "08", kind: "fruit" });
  const padded = anchors(paddedHtml).filter((anchor) => anchor.lang === "en").map((anchor) => anchor.href);
  expect(padded).toEqual(["/en/guide?kind=fruit", "/en/guide?kind=fruit"]);
  expect(paddedHtml).not.toContain("month=08");
});
