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
  author: "Huda N.",
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
    <Hero locale="ar" currentMonth={8} inSeasonCount={4} produce={produce} photo={undefined} />,
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
    <Hero locale="en" currentMonth={3} inSeasonCount={2} produce={produce} photo={photo} />,
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
