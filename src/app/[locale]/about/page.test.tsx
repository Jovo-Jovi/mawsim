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

it("leaves the about header without a weave, or paints that weave inside a body section, the credits, or the sample-data notice", async () => {
  localeState.value = "en";
  const english = await renderToStaticMarkup(await AboutPage());
  const band = elementByAttr(english, 'data-texture-band="about"');
  expect(band).toContain("<h1");
  expect(band).toContain("About Mawsim");
  expect(band).toContain("<pattern");
  expect(band).not.toContain("<h2");
  expect(band).not.toContain("<section");
  expect(band).not.toMatch(/<p[\s>]/);
  expect(band).not.toContain("Sample data");
  const body = english.slice(english.indexOf("<section"), english.lastIndexOf("</section>") + "</section>".length);
  expect(body).toContain("<h2");
  expect(body).toContain("Photographs");
  expect(body).not.toContain("<pattern");
  expect(body).not.toContain("data-texture-band");
  expect(english.slice(english.indexOf("<h1"))).not.toContain("<pattern");
  expect(english.match(/<pattern\b/g)?.length).toBe(1);
  expect(english).toContain("Sample data for a test product — not farming or nutrition advice.");

  localeState.value = "ar";
  const arabic = await renderToStaticMarkup(await AboutPage());
  const arabicBand = elementByAttr(arabic, 'data-texture-band="about"');
  expect(arabicBand).toContain("عن موسم");
  expect(arabicBand).toContain("<pattern");
  expect(arabicBand).not.toContain("<section");
  const arabicBody = arabic.slice(arabic.indexOf("<section"), arabic.lastIndexOf("</section>") + "</section>".length);
  expect(arabicBody).toContain("الصور");
  expect(arabicBody).not.toContain("<pattern");
  expect(arabic.match(/<pattern\b/g)?.length).toBe(1);
});

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
