import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { getProduceBySlug, type ProducePhotoRow } from "@/modules/produce";
import { Hero } from "./Hero";

function tomato() {
  const found = getProduceBySlug("tomato");
  if (!found) throw new Error("missing produce");
  return found;
}

const photo: ProducePhotoRow = {
  key: "hero",
  file: "/photos/hero.jpg",
  width: 1800,
  height: 1400,
  alt_en: "Market stall in warm light",
  alt_ar: "كشك في ضوء دافئ",
  source: "licensed",
  author: "Fixture Studio",
  source_url: "https://localhost/source",
  licence: "Commercial use",
  licence_url: "https://localhost/licence",
  credit_required: true,
};

function heading(html: string): string {
  return /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "";
}

it("drops the month from its own span, points the guide link at another month, renders more than one priority photo, or shows a count other than inSeasonCount", () => {
  const produce = tomato();
  const fallback = renderToStaticMarkup(
    <Hero locale="ar" currentMonth={8} inSeasonCount={4} produce={produce} photo={undefined} texture={undefined} />,
  );
  expect(fallback.match(/<h1\b/g)?.length).toBe(1);
  expect(heading(fallback)).toContain("الطازج في مصر في");
  expect(heading(fallback)).toContain("<span");
  expect(/<span\b[^>]*>أغسطس<\/span>/.test(heading(fallback))).toBe(true);
  expect(fallback).toContain('href="/ar/guide?month=8"');
  expect(fallback).not.toContain("<img");
  expect(fallback).toContain("في موسمه هذا الشهر: 4");
  expect(fallback).not.toContain("في موسمه هذا الشهر: 7");

  const photographed = renderToStaticMarkup(
    <Hero locale="en" currentMonth={3} inSeasonCount={2} produce={produce} photo={photo} texture={undefined} />,
  );
  expect(photographed.match(/<img\b/g)?.length).toBe(1);
  expect(photographed).not.toContain('loading="lazy"');
  expect(/<span\b[^>]*>March<\/span>/.test(heading(photographed))).toBe(true);
  expect(photographed).toContain('href="/en/guide?month=3"');
  expect(photographed).toContain("In season this month: 2");

  const css = readFileSync(new URL("./Hero.module.css", import.meta.url), "utf8");
  expect(css).toContain("var(--color-accent)");
  expect(css).toContain("var(--target-min)");
});

function fileFromImage(tag: string): string | null {
  const src = /src="([^"]*)"/.exec(tag)?.[1] ?? "";
  return new URL(src.replaceAll("&amp;", "&"), "http://localhost").searchParams.get("url");
}

it("drops the weave from the hero band, paints it over the headline, or loads the texture photograph ahead of the hero photograph", () => {
  const produce = tomato();
  const plain = renderToStaticMarkup(
    <Hero locale="en" currentMonth={8} inSeasonCount={4} produce={produce} photo={undefined} texture={undefined} />,
  );
  const bandAt = plain.indexOf('data-texture-band="hero"');
  const patternAt = plain.indexOf("<pattern");
  const headlineAt = plain.indexOf("<h1");
  expect(bandAt).toBeGreaterThan(-1);
  expect(patternAt).toBeGreaterThan(bandAt);
  expect(patternAt).toBeLessThan(headlineAt);
  expect(plain.match(/<pattern\b/g)?.length).toBe(1);
  expect(plain.slice(headlineAt)).not.toContain("<pattern");
  expect(plain).toContain('aria-hidden="true"');

  const texture: ProducePhotoRow = {
    ...photo,
    key: "texture",
    file: "/photos/texture/linen.jpg",
    alt_en: "Linen weave",
    alt_ar: "نسيج كتاني",
  };
  const layered = renderToStaticMarkup(
    <Hero locale="en" currentMonth={8} inSeasonCount={4} produce={produce} photo={photo} texture={texture} />,
  );
  const images = [...layered.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  const lazy = images.filter((tag) => tag.includes('loading="lazy"'));
  const eager = images.filter((tag) => !tag.includes('loading="lazy"'));
  expect(images).toHaveLength(2);
  expect(lazy).toHaveLength(1);
  expect(fileFromImage(lazy[0] ?? "")).toBe("/photos/texture/linen.jpg");
  expect(eager).toHaveLength(1);
  expect(fileFromImage(eager[0] ?? "")).toBe("/photos/hero.jpg");
  expect(layered).not.toContain("<pattern");
  expect(layered).not.toContain("Linen weave");
  expect(layered).not.toContain("نسيج كتاني");
});
