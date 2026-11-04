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

it("adds a second h1, reorders the sections, or drops the empty-credits or sample-data sentence", async () => {
  localeState.value = "en";
  const english = await renderToStaticMarkup(await AboutPage());
  expect(texts(english, "h1")).toEqual(["About Mawsim"]);
  expect(texts(english, "h2")).toEqual([
    "What Mawsim is",
    "What Mawsim collects",
    "Two languages",
    "Photographs",
  ]);
  expect(mainHtml(english)).toContain(
    "No photographs are listed yet. Until one is, each frame shows a coloured tile with its season ring.",
  );
  expect(mainHtml(english)).toContain("Sample data for a test product — not farming or nutrition advice.");
  expect(english).toContain("Sample data for a test product — not farming or nutrition advice.");
  expect(english).not.toContain("https://");

  localeState.value = "ar";
  const arabic = await renderToStaticMarkup(await AboutPage());
  expect(texts(arabic, "h1")).toEqual(["عن موسم"]);
  expect(texts(arabic, "h2")).toEqual(["ما هو موسم", "ما الذي يجمعه موسم", "لغتان", "الصور"]);
  expect(mainHtml(arabic)).toContain("لم تُدرَج أي صورة بعد. وحتى تُدرَج، يعرض كل إطار مساحة ملوّنة عليها حلقة الموسم.");
  expect(mainHtml(arabic)).toContain("بيانات تجريبية لمنتج قيد التجربة — وليست نصيحة زراعية أو غذائية.");
  expect(arabic).not.toContain("https://");
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
