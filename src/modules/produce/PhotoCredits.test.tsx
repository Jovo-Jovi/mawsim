import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { PhotoCredits } from "./PhotoCredits";
import type { GeneratedPhotoRow, LicensedPhotoRow, OwnPhotoRow } from "./photos";

const hero: LicensedPhotoRow = {
  key: "hero",
  file: "/photos/hero.jpg",
  width: 1600,
  height: 1200,
  alt_en: "Market stall in warm light",
  alt_ar: "كشك في ضوء دافئ",
  source: "licensed",
  author: "Fixture Studio One",
  source_url: "https://localhost/hero-source",
  licence: "Fixture Licence",
  licence_url: "https://localhost/hero-licence",
  credit_required: true,
};

const mango: LicensedPhotoRow = {
  key: "mango",
  file: "/photos/mango.jpg",
  width: 1200,
  height: 900,
  alt_en: "Mango on linen",
  alt_ar: "مانجو على قماش",
  source: "licensed",
  author: "Fixture Studio Two",
  source_url: "https://localhost/mango-source",
  licence: "Fixture Licence",
  licence_url: "https://localhost/mango-licence",
  credit_required: true,
};

const missing: LicensedPhotoRow = {
  key: "not-a-slug",
  file: "/photos/missing.jpg",
  width: 1200,
  height: 900,
  alt_en: "Fixture alt",
  alt_ar: "وصف تجريبي",
  source: "licensed",
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

const generated: GeneratedPhotoRow = {
  key: "hero",
  file: "/photos/hero.png",
  width: 1600,
  height: 1600,
  alt_en: "Market stall in warm light",
  alt_ar: "كشك في ضوء دافئ",
  source: "generated",
  model: "grok-imagine-image-2.0",
  prompt: "A market stall",
  generated_on: "2026-11-05",
  terms_url: "https://localhost/terms",
  credit_required: true,
};

const own: OwnPhotoRow = {
  key: "dates",
  file: "/photos/dates.png",
  width: 1200,
  height: 900,
  alt_en: "Dates on wood",
  alt_ar: "بلح على خشب",
  source: "own",
  author: "Mawsim",
  credit_required: true,
};

const texture: OwnPhotoRow = {
  key: "texture",
  file: "/photos/texture.png",
  width: 1024,
  height: 1024,
  alt_en: "Linen texture",
  alt_ar: "نسيج من الكتان",
  source: "own",
  author: "Mawsim",
  credit_required: true,
};

it("renders a generated credit without the model in bdi, or points the terms link elsewhere", () => {
  const english = renderToStaticMarkup(<PhotoCredits locale="en" credits={[generated]} />);
  expect(english).toContain("Home page");
  expect(english).toContain("Generated for Mawsim with <bdi>grok-imagine-image-2.0</bdi>");
  expect(english).toContain('href="https://localhost/terms"');
  expect(english).toContain("Terms of use");
  expect(english).not.toContain("Source");
  expect(english).not.toContain("Licence:");
  const arabic = renderToStaticMarkup(<PhotoCredits locale="ar" credits={[generated]} />);
  expect(arabic).toContain("الصفحة الرئيسية");
  expect(arabic).toContain("صُنعت لموسم بالذكاء الاصطناعي (<bdi>grok-imagine-image-2.0</bdi>)");
  expect(arabic).toContain('href="https://localhost/terms"');
  expect(arabic).toContain("شروط الاستخدام");
  for (const html of [english, arabic]) {
    const anchors = anchorTags(html);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toContain('rel="noreferrer"');
    expect(anchors[0]).not.toContain("target");
  }
});

it("renders an own credit with a link, or leaves the author outside bdi", () => {
  const english = renderToStaticMarkup(<PhotoCredits locale="en" credits={[own]} />);
  expect(english).toContain("Dates");
  expect(english).toContain("Artwork by <bdi>Mawsim</bdi>");
  expect(english).not.toContain("<a");
  const arabic = renderToStaticMarkup(<PhotoCredits locale="ar" credits={[own]} />);
  expect(arabic).toContain("بلح");
  expect(arabic).toContain("عمل فني: <bdi>Mawsim</bdi>");
  expect(arabic).not.toContain("<a");
});

it("names a texture row as produce, or uses the hero subject", () => {
  const english = renderToStaticMarkup(<PhotoCredits locale="en" credits={[texture]} />);
  expect(english).toContain("Background texture");
  expect(english).not.toContain("Home page");
  expect(english).toContain("Artwork by <bdi>Mawsim</bdi>");
  const arabic = renderToStaticMarkup(<PhotoCredits locale="ar" credits={[texture]} />);
  expect(arabic).toContain("خلفية الصفحة");
  expect(arabic).not.toContain("الصفحة الرئيسية");
  expect(arabic).toContain("عمل فني: <bdi>Mawsim</bdi>");
});
