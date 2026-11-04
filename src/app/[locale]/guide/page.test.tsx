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

function chipHrefs(html: string, label: string): string[] {
  const nav = new RegExp(`<nav\\b[^>]*aria-label="${label}"[^>]*>[\\s\\S]*?</nav>`).exec(html)?.[0] ?? "";
  return [...nav.matchAll(/href="([^"]*)"/g)].map((match) => (match[1] ?? "").replaceAll("&amp;", "&"));
}

const augustAll = ["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"];

async function render(query: { month?: string | string[]; kind?: string | string[] }): Promise<string> {
  return renderToStaticMarkup(await GuidePage({ searchParams: Promise.resolve(query) }));
}

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
