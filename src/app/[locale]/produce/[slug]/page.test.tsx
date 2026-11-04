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

import { ensureStatic, generateMetadata, generateStaticParams, default as ProducePage } from "./page";

const catalogueSlugs = [
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function mainHtml(html: string): string {
  return html.split("<footer")[0] ?? html;
}

function attr(name: string, value: string): string {
  return `${name}="${value}"`;
}

it("streams an unknown slug as HTTP 200", () => {
  expect(ensureStatic).toBe("navigation");
});

it("omits a produce slug or returns a different set per locale", async () => {
  localeState.value = "ar";
  const arabic = await generateStaticParams();
  localeState.value = "en";
  const english = await generateStaticParams();
  const expected = catalogueSlugs.map((slug) => ({ slug }));
  expect(arabic).toEqual(expected);
  expect(english).toEqual(expected);
  expect(arabic.every((row) => Object.keys(row).join() === "slug")).toBe(true);
});

it("sets a generic title, drops the season sentence, or adds a canonical", async () => {
  localeState.value = "ar";
  const arabic = await generateMetadata({ params: Promise.resolve({ slug: "mango" }) });
  expect(arabic.title).toBe("مانجو \u2014 موسم");
  expect(arabic.description).toBe("في الموسم: من يوليو إلى أكتوبر");
  expect(arabic.alternates).toEqual({ languages: { en: "/en/produce/mango" } });
  expect(JSON.stringify(arabic)).not.toContain("canonical");
  expect(JSON.stringify(arabic)).not.toContain("metadataBase");

  localeState.value = "en";
  const english = await generateMetadata({ params: Promise.resolve({ slug: "orange" }) });
  expect(english.title).toBe("Orange \u2014 Mawsim");
  expect(english.description).toBe("In season: December \u2013 April");
  expect(english.alternates).toEqual({ languages: { ar: "/ar/produce/orange" } });
  expect(JSON.stringify(english)).not.toContain("canonical");
});

it("renders an English mango page as Arabic, drops the season sentence, or skips the current-month tick", async () => {
  localeState.value = "ar";
  const html = renderToStaticMarkup(await ProducePage({ params: Promise.resolve({ slug: "mango" }) }));
  const main = mainHtml(html);
  expect(html.match(/<h1\b/g)?.length).toBe(1);
  expect(html).toContain("<h1><bdi>مانجو</bdi></h1>");
  expect(html).toContain(attr("lang", "en"));
  expect(html).toContain("<bdi>Mango</bdi>");
  expect(main).toContain("فاكهة");
  expect(main).toContain("في الموسم: من يوليو إلى أكتوبر");
  expect(main).toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
  expect(main).not.toContain("Ripen on the counter, then chill.");
  expect(main).toContain("طريقة الحفظ");
  expect(html.match(/<line\b/g)?.length).toBe(1);
  expect(html.match(/data-current="true"/g)?.length).toBe(1);
  expect(html.match(/هذا الشهر/g)?.length).toBe(1);
  expect(html).not.toContain("<img");
  expect(html.match(/href="\/en\/produce\/mango"/g)?.length).toBe(2);
  expect(main).toContain("بيانات تجريبية لمنتج قيد التجربة — وليست نصيحة زراعية أو غذائية.");
});

it("renders an Arabic mango page as English, or points the language link at the home page", async () => {
  localeState.value = "en";
  const html = renderToStaticMarkup(await ProducePage({ params: Promise.resolve({ slug: "mango" }) }));
  const main = mainHtml(html);
  expect(html.match(/<h1\b/g)?.length).toBe(1);
  expect(html).toContain("<h1><bdi>Mango</bdi></h1>");
  expect(html).toContain(attr("lang", "ar"));
  expect(html).toContain("<bdi>مانجو</bdi>");
  expect(main).toContain("Fruit");
  expect(main).toContain("In season: July \u2013 October");
  expect(main).toContain("Ripen on the counter, then chill.");
  expect(main).not.toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
  expect(main).toContain("How to keep it");
  expect(html.match(/This month/g)?.length).toBe(1);
  expect(html.match(/href="\/ar\/produce\/mango"/g)?.length).toBe(2);
  expect(main).toContain("Sample data for a test product — not farming or nutrition advice.");
});

it("labels molokhia as fruit or omits the leafy season sentence", async () => {
  localeState.value = "ar";
  const html = renderToStaticMarkup(await ProducePage({ params: Promise.resolve({ slug: "molokhia" }) }));
  const main = mainHtml(html);
  expect(html).toContain("<h1><bdi>ملوخية</bdi></h1>");
  expect(html).toContain("<bdi>Molokhia</bdi>");
  expect(main).toContain("ورقيات");
  expect(main).not.toContain("فاكهة");
  expect(html.match(/data-kind="leafy"/g)?.length).toBe(3);
  expect(html).not.toContain('data-kind="fruit"');
  expect(html).not.toContain('data-kind="vegetable"');
  expect(main).toContain("في الموسم: من مايو إلى سبتمبر");
  expect(main).toContain("تستخدم طازجة أو تجمد مفرومة.");
});

it("accepts a near-miss slug or echoes it in the failure", async () => {
  localeState.value = "ar";
  for (const slug of ["kiwi", "Mango", "mang", "mango-extra"]) {
    await expect(ProducePage({ params: Promise.resolve({ slug }) })).rejects.toThrow(new Error("not-found"));
    await expect(generateMetadata({ params: Promise.resolve({ slug }) })).rejects.toThrow(new Error("not-found"));
  }
});
