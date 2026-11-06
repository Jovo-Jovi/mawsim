import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { getHeroPhoto, inSeasonIn, listProduce } from "@/modules/produce";
import type { CalendarMonth } from "../../domain";
import { YearStory } from "./YearStory";

const HERO_FILE = "/photos/hero/hero.webp";

const augustForward = ["tomato", "mango", "watermelon", "guava", "okra", "molokhia", "dates"];
const januaryForward = ["tomato", "orange", "strawberry"];

function visibleHeading(html: string): string {
  const inner = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
  const shown = inner.replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, "");
  return shown.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function visibleCount(html: string): string {
  const count = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
  const shown = count.replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, "");
  return shown.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function spanStates(container: string): { shown: string[]; hidden: string[] } {
  const shown: string[] = [];
  const hidden: string[] = [];
  for (const match of container.matchAll(/<span\b([^>]*)>([^<]*)<\/span>/g)) {
    const text = (match[2] ?? "").replace(/\s+/g, " ").trim();
    if ((match[1] ?? "").includes('aria-hidden="true"')) hidden.push(text);
    else shown.push(text);
  }
  return { shown, hidden };
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

function placeStyle(html: string, slug: string): string {
  const at = html.indexOf(`data-story-produce="${slug}"`);
  const childStart = html.lastIndexOf("<div", at);
  const parentStart = html.lastIndexOf("<div", childStart - 1);
  const tag = html.slice(parentStart, html.indexOf(">", parentStart) + 1);
  return /style="([^"]*)"/.exec(tag)?.[1] ?? "";
}

function forwardSlugs(html: string): string[] {
  return [...html.matchAll(/data-story-produce="([a-z-]+)"([^>]*)/g)].flatMap((match) => {
    if (!(match[2] ?? "").includes("data-story-forward")) return [];
    return [match[1] ?? ""];
  });
}

function storySlugs(html: string): string[] {
  return [...html.matchAll(/data-story-produce="([a-z-]+)"/g)].map((match) => match[1] ?? "");
}

function imageFile(tag: string): string {
  const src = (/src="([^"]*)"/.exec(tag)?.[1] ?? "").replaceAll("&amp;", "&");
  return new URL(src, "http://localhost").searchParams.get("url") ?? "";
}

it("names another month in the heading, counts produce outside that month, or points the guide link elsewhere", () => {
  const cases: { locale: Locale; month: CalendarMonth; heading: string; count: string; forward: string[] }[] = [
    {
      locale: "en",
      month: 8,
      heading: "What is fresh in Egypt in August",
      count: "In season in August: 7",
      forward: augustForward,
    },
    {
      locale: "ar",
      month: 8,
      heading: "الطازج في مصر في أغسطس",
      count: "في موسمه في أغسطس: 7",
      forward: augustForward,
    },
    {
      locale: "en",
      month: 1,
      heading: "What is fresh in Egypt in January",
      count: "In season in January: 3",
      forward: januaryForward,
    },
    {
      locale: "ar",
      month: 1,
      heading: "الطازج في مصر في يناير",
      count: "في موسمه في يناير: 3",
      forward: januaryForward,
    },
  ];
  for (const sample of cases) {
    const html = renderToStaticMarkup(
      <YearStory locale={sample.locale} currentMonth={sample.month} texture={undefined} />,
    );
    expect(html.match(/<h1\b/g)?.length, sample.locale).toBe(1);
    expect(html).not.toContain("aria-live");
    expect(visibleHeading(html)).toBe(sample.heading);
    expect(visibleCount(html)).toBe(sample.count);
    expect(inSeasonIn(sample.month).length).toBe(sample.forward.length);
    expect(html).toContain(`href="/${sample.locale}/guide?month=${sample.month}"`);
    expect(html).not.toContain(`href="/${sample.locale}/guide?month=${sample.month === 1 ? 8 : 1}"`);

    const heading = /<h1\b[^>]*>[\s\S]*?<\/h1>/.exec(html)?.[0] ?? "";
    const headingSlots = spanStates(heading);
    expect(headingSlots.shown).toEqual([sample.heading.split(" ").at(-1) ?? ""]);
    expect(headingSlots.hidden).toHaveLength(11);
    expect(headingSlots.hidden).not.toContain(headingSlots.shown[0]);

    const count = /<p\b[^>]*>[\s\S]*?<\/p>/.exec(html)?.[0] ?? "";
    const countSlots = spanStates(count);
    expect(countSlots.shown).toEqual([sample.count]);
    expect(countSlots.hidden).toHaveLength(11);

    expect(forwardSlugs(html)).toEqual(inSeasonIn(sample.month).map((row) => row.slug));
    expect(forwardSlugs(html)).toEqual(sample.forward);
  }
});

it("brings a produce outside this month forward, scrambles the ten circles, or puts the hero photograph inside the turning ring", () => {
  const catalogue = listProduce().map((row) => row.slug);
  expect(catalogue).toHaveLength(10);
  const hero = getHeroPhoto();
  expect(hero?.file).toBe(HERO_FILE);

  for (const locale of ["en", "ar"] as const) {
    const html = renderToStaticMarkup(<YearStory locale={locale} currentMonth={8} texture={undefined} />);
    expect(storySlugs(html)).toEqual(catalogue);
    expect(html.match(/data-story-produce="/g)?.length).toBe(10);
    expect(html.match(/data-dial-label="/g)?.length).toBe(12);
    expect(html).not.toMatch(/data-dial-label=""[^>]*>\s*<a\b/);
    expect(html).toContain(locale === "en" ? "--dial-turn:-210deg" : "--dial-turn:210deg");

    const turn = elementByAttr(html, 'data-dial-turn=""');
    expect(turn).not.toContain("data-hero-photo");
    expect(turn).not.toContain("data-story-produce");
    expect(html.indexOf("data-hero-photo")).toBeLessThan(html.indexOf('data-dial-turn=""'));

    const photo = elementByAttr(html, "data-hero-photo");
    const image = /<img\b[^>]*>/.exec(photo)?.[0] ?? "";
    expect(imageFile(image)).toBe(HERO_FILE);
    expect(image).not.toContain('loading="lazy"');
    expect(photo).not.toContain('alt=""');

    for (const match of html.matchAll(/data-story-produce="([a-z-]+)"([^>]*)>([\s\S]*?)<\/div>/g)) {
      const slug = match[1] ?? "";
      const tag = match[2] ?? "";
      const body = match[3] ?? "";
      expect(tag, slug).not.toContain("style=");
      expect(body).toContain('aria-hidden="true"');
      expect(body).toContain('alt=""');
    }

    expect(placeStyle(html, "tomato")).toContain("--orbit-x:0.0000cqi");
    expect(placeStyle(html, "tomato")).toContain("--orbit-y:-47.5000cqi");
    const mangoX = /--orbit-x:([^;]+)/.exec(placeStyle(html, "mango"))?.[1] ?? "";
    expect(mangoX.startsWith("-")).toBe(locale === "ar");
    expect(mangoX).not.toBe("0.0000cqi");
  }

  const english = renderToStaticMarkup(<YearStory locale="en" currentMonth={8} texture={undefined} />);
  const arabic = renderToStaticMarkup(<YearStory locale="ar" currentMonth={8} texture={undefined} />);
  const englishX = /--orbit-x:([^;]+)/.exec(placeStyle(english, "mango"))?.[1] ?? "";
  const arabicX = /--orbit-x:([^;]+)/.exec(placeStyle(arabic, "mango"))?.[1] ?? "";
  expect(arabicX).toBe(`-${englishX}`);
  expect(placeStyle(english, "mango")).toContain(
    /--orbit-y:([^;]+)/.exec(placeStyle(arabic, "mango"))?.[1] ?? "missing",
  );

  const css = readFileSync(new URL("./YearStory.module.css", import.meta.url), "utf8");
  expect(css).toContain("transform: scale(1)");
  expect(css).toContain("opacity: 1");
  expect(css).toContain("transform: scale(var(--story-back-scale))");
  expect(css).toContain("opacity: var(--story-back-opacity)");
  expect(css).toContain("inline-size: var(--dial-size)");
  expect(css).toContain("max-inline-size: 100%");
  expect(css).not.toContain("position: sticky");
  expect(css).not.toContain("--story-step");
  expect(css).not.toMatch(/@keyframes|\banimation\b|\btransition\b/);
  expect(english).not.toMatch(/data-story-produce="[^"]*"[^>]*style="[^"]*(?:scale|opacity)/);
});
