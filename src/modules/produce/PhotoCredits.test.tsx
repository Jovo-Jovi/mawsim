import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { PhotoCredits } from "./PhotoCredits";
import type { ProducePhotoRow } from "./photos";

const hero: ProducePhotoRow = {
  key: "hero",
  file: "/photos/hero.jpg",
  width: 1600,
  height: 1200,
  alt_en: "Market stall in warm light",
  alt_ar: "كشك في ضوء دافئ",
  author: "Fixture Studio One",
  source_url: "https://localhost/hero-source",
  licence: "Fixture Licence",
  licence_url: "https://localhost/hero-licence",
  credit_required: true,
};

const mango: ProducePhotoRow = {
  key: "mango",
  file: "/photos/mango.jpg",
  width: 1200,
  height: 900,
  alt_en: "Mango on linen",
  alt_ar: "مانجو على قماش",
  author: "Fixture Studio Two",
  source_url: "https://localhost/mango-source",
  licence: "Fixture Licence",
  licence_url: "https://localhost/mango-licence",
  credit_required: true,
};

const missing: ProducePhotoRow = {
  key: "not-a-slug",
  file: "/photos/missing.jpg",
  width: 1200,
  height: 900,
  alt_en: "Fixture alt",
  alt_ar: "وصف تجريبي",
  author: "Fixture Studio One",
  source_url: "https://localhost/missing-source",
  licence: "Fixture Licence",
  licence_url: "https://localhost/missing-licence",
  credit_required: true,
};

function items(html: string): string[] {
  return [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1] ?? "");
}

function anchorTags(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]);
}

it("renders a list or a link when no photograph is credited, or drops the empty sentence", () => {
  const english = renderToStaticMarkup(<PhotoCredits locale="en" credits={[]} />);
  expect(english).toContain(
    "No photographs are listed yet. Until one is, each frame shows a coloured tile with its season ring.",
  );
  expect(english).not.toContain("<ul");
  expect(english).not.toContain("<a");

  const arabic = renderToStaticMarkup(<PhotoCredits locale="ar" credits={[]} />);
  expect(arabic).toContain("لم تُدرَج أي صورة بعد. وحتى تُدرَج، يعرض كل إطار مساحة ملوّنة عليها حلقة الموسم.");
  expect(arabic).not.toContain("<ul");
  expect(arabic).not.toContain("<a");
});

it("reorders credits, leaves an author or licence outside bdi, drops noreferrer, or points a link at the wrong href", () => {
  const locales: { locale: Locale; subjects: [string, string] }[] = [
    { locale: "en", subjects: ["Home page", "Mango"] },
    { locale: "ar", subjects: ["الصفحة الرئيسية", "مانجو"] },
  ];
  for (const { locale, subjects } of locales) {
    const html = renderToStaticMarkup(<PhotoCredits locale={locale} credits={[hero, mango]} />);
    const rows = items(html);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(subjects[0]);
    expect(rows[1]).toContain(subjects[1]);
    expect(rows[0]).toContain("<bdi>Fixture Studio One</bdi>");
    expect(rows[1]).toContain("<bdi>Fixture Studio Two</bdi>");
    expect(rows[0]).toContain('href="https://localhost/hero-source"');
    expect(rows[0]).toContain('href="https://localhost/hero-licence"');
    expect(rows[1]).toContain('href="https://localhost/mango-source"');
    expect(rows[1]).toContain('href="https://localhost/mango-licence"');
    expect(rows[0]).toContain("<bdi>Fixture Licence</bdi>");
    expect(rows[1]).toContain("<bdi>Fixture Licence</bdi>");
    const anchors = anchorTags(html);
    expect(anchors).toHaveLength(4);
    for (const tag of anchors) {
      expect(tag).toContain('rel="noreferrer"');
      expect(tag).not.toContain("target");
    }
    expect(html).not.toContain("target=");
  }
});

it("names a slug that is not produce instead of failing closed", () => {
  expect(() => renderToStaticMarkup(<PhotoCredits locale="en" credits={[missing]} />)).toThrow(
    "photo credit: produce is missing",
  );
});
