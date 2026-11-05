import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const localeState = vi.hoisted(() => ({ value: "ar" }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));

vi.mock("next/root-params", () => ({
  locale: () => Promise.resolve(localeState.value),
}));

import { generateMetadata, default as AboutPage } from "./page";

const TEXTURE_FILE = "/photos/texture/texture.webp";
const TERMS_URLS = (
  JSON.parse(readFileSync(new URL("../../../../content/photos.json", import.meta.url), "utf8")) as {
    credit_required: boolean;
    terms_url?: string;
  }[]
)
  .filter((row) => row.credit_required)
  .map((row) => row.terms_url);
const EMPTY_CREDITS_EN =
  "No photographs are listed yet. Until one is, each frame shows a coloured tile with its season ring.";
const EMPTY_CREDITS_AR = "لم تُدرَج أي صورة بعد. وحتى تُدرَج، يعرض كل إطار مساحة ملوّنة عليها حلقة الموسم.";
const SUBJECTS_EN = [
  "Home page",
  "Background texture",
  "Tomato",
  "Mango",
  "Orange",
  "Strawberry",
  "Watermelon",
  "Guava",
  "Pomegranate",
  "Okra",
  "Molokhia",
  "Dates",
];
const SUBJECTS_AR = [
  "الصفحة الرئيسية",
  "خلفية الصفحة",
  "طماطم",
  "مانجو",
  "برتقال",
  "فراولة",
  "بطيخ",
  "جوافة",
  "رمان",
  "بامية",
  "ملوخية",
  "بلح",
];

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

function creditList(html: string): string {
  return /<ul\b[^>]*>[\s\S]*?<\/ul>/.exec(html)?.[0] ?? "";
}

function creditSubjects(html: string): string[] {
  return [...creditList(html).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => {
    const subject = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(match[1] ?? "")?.[1] ?? "";
    return subject.replace(/<[^>]+>/g, "");
  });
}

function httpsInMarkup(html: string): string[] {
  return [...html.matchAll(/https:\/\/[^\s"'<>]*/g)].map((match) => match[0].replaceAll("&amp;", "&"));
}

function creditHrefs(html: string): string[] {
  return [...creditList(html).matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((match) =>
    (match[1] ?? "").replaceAll("&amp;", "&"),
  );
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

function mainHtml(html: string): string {
  return html.split("<footer")[0] ?? html;
}

function texts(html: string, tag: "h1" | "h2"): string[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g"))].map((match) =>
    (match[1] ?? "").replace(/<[^>]+>/g, ""),
  );
}

function languageHrefs(html: string, lang: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)].flatMap((match) => {
    const tag = match[0];
    const found = /(?:^|\s)lang="([^"]*)"/.exec(tag)?.[1] ?? null;
    if (found !== lang) return [];
    return [(/href="([^"]*)"/.exec(tag)?.[1] ?? "").replaceAll("&amp;", "&")];
  });
}

it("leaves the about header without its texture photograph, or paints that photograph inside a body section, the credits, or the sample-data notice", async () => {
  localeState.value = "en";
  const english = await renderToStaticMarkup(await AboutPage());
  const band = elementByAttr(english, 'data-texture-band="about"');
  expect(band).toContain("<h1");
  expect(band).toContain("About Mawsim");
  expect(filesWithAlt(band, "")).toEqual([TEXTURE_FILE]);
  expect(band).not.toContain("<pattern");
  expect(band).not.toContain("<h2");
  expect(band).not.toContain("<section");
  expect(band).not.toMatch(/<p[\s>]/);
  expect(band).not.toContain("Sample data");
  const body = english.slice(english.indexOf("<section"), english.lastIndexOf("</section>") + "</section>".length);
  expect(body).toContain("<h2");
  expect(body).toContain("Photographs");
  expect(body).not.toContain("<pattern");
  expect(filesWithAlt(body, "")).toEqual([]);
  expect(body).not.toContain("data-texture-band");
  expect(english.slice(english.indexOf("<h1"))).not.toContain("<pattern");
  expect(english.match(/<pattern\b/g) ?? []).toHaveLength(0);
  expect(filesWithAlt(english, "")).toEqual([TEXTURE_FILE]);
  expect(english).toContain("Sample data for a test product — not farming or nutrition advice.");

  localeState.value = "ar";
  const arabic = await renderToStaticMarkup(await AboutPage());
  const arabicBand = elementByAttr(arabic, 'data-texture-band="about"');
  expect(arabicBand).toContain("عن موسم");
  expect(filesWithAlt(arabicBand, "")).toEqual([TEXTURE_FILE]);
  expect(arabicBand).not.toContain("<pattern");
  expect(arabicBand).not.toContain("<section");
  const arabicBody = arabic.slice(arabic.indexOf("<section"), arabic.lastIndexOf("</section>") + "</section>".length);
  expect(arabicBody).toContain("الصور");
  expect(arabicBody).not.toContain("<pattern");
  expect(filesWithAlt(arabicBody, "")).toEqual([]);
  expect(arabic.match(/<pattern\b/g) ?? []).toHaveLength(0);
  expect(filesWithAlt(arabic, "")).toEqual([TEXTURE_FILE]);
});

it("adds a second h1, reorders the sections, drops a credited subject, places an https outside a credit href, or emits a script", async () => {
  localeState.value = "en";
  const english = await renderToStaticMarkup(await AboutPage());
  expect(texts(english, "h1")).toEqual(["About Mawsim"]);
  expect(texts(english, "h2")).toEqual([
    "What Mawsim is",
    "What Mawsim collects",
    "Two languages",
    "Photographs",
  ]);
  expect(mainHtml(english)).not.toContain(EMPTY_CREDITS_EN);
  expect(creditSubjects(english)).toEqual(SUBJECTS_EN);
  expect(mainHtml(english)).toContain("Sample data for a test product — not farming or nutrition advice.");
  expect(english).toContain("Sample data for a test product — not farming or nutrition advice.");
  expect(english).not.toMatch(/<script/i);
  const englishUrls = httpsInMarkup(english);
  const englishHrefs = creditHrefs(english);
  expect(englishUrls).toEqual(englishHrefs);
  expect(TERMS_URLS).toHaveLength(SUBJECTS_EN.length);
  expect(englishHrefs).toEqual(TERMS_URLS);
  expect(httpsInMarkup(english.replace(creditList(english), ""))).toEqual([]);

  localeState.value = "ar";
  const arabic = await renderToStaticMarkup(await AboutPage());
  expect(texts(arabic, "h1")).toEqual(["عن موسم"]);
  expect(texts(arabic, "h2")).toEqual(["ما هو موسم", "ما الذي يجمعه موسم", "لغتان", "الصور"]);
  expect(mainHtml(arabic)).not.toContain(EMPTY_CREDITS_AR);
  expect(creditSubjects(arabic)).toEqual(SUBJECTS_AR);
  expect(mainHtml(arabic)).toContain("بيانات تجريبية لمنتج قيد التجربة — وليست نصيحة زراعية أو غذائية.");
  expect(arabic).not.toMatch(/<script/i);
  const arabicUrls = httpsInMarkup(arabic);
  const arabicHrefs = creditHrefs(arabic);
  expect(arabicUrls).toEqual(arabicHrefs);
  expect(TERMS_URLS).toHaveLength(SUBJECTS_AR.length);
  expect(arabicHrefs).toEqual(TERMS_URLS);
  expect(httpsInMarkup(arabic.replace(creditList(arabic), ""))).toEqual([]);
});

it("points a language link at another page", async () => {
  localeState.value = "en";
  const english = languageHrefs(await renderToStaticMarkup(await AboutPage()), "ar");
  expect(english).toEqual(["/ar/about", "/ar/about"]);

  localeState.value = "ar";
  const arabic = languageHrefs(await renderToStaticMarkup(await AboutPage()), "en");
  expect(arabic).toEqual(["/en/about", "/en/about"]);
});

it("sets a generic title, drops the alternate, or adds a canonical", async () => {
  localeState.value = "en";
  const english = await generateMetadata();
  expect(english.title).toBe("About \u2014 Mawsim");
  expect(english.description).toBe("What is in season in Egypt, month by month.");
  expect(english.alternates).toEqual({ languages: { ar: "/ar/about" } });
  expect(JSON.stringify(english)).not.toContain("canonical");

  localeState.value = "ar";
  const arabic = await generateMetadata();
  expect(arabic.title).toBe("عن الموقع \u2014 موسم");
  expect(arabic.description).toBe("ما الذي في موسمه في مصر، شهرًا بشهر.");
  expect(arabic.alternates).toEqual({ languages: { en: "/en/about" } });
  expect(JSON.stringify(arabic)).not.toContain("canonical");
});
