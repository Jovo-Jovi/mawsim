import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { getProduceBySlug, ProduceCard, type Produce } from "./index";
import type { ProducePhotoRow } from "./photos";

function mango(): Produce {
  const found = getProduceBySlug("mango");
  if (!found) throw new Error("missing produce");
  return found;
}

const photo: ProducePhotoRow = {
  key: "mango",
  file: "/photos/produce/mango.jpg",
  width: 1800,
  height: 1400,
  alt_en: "Mango on linen",
  alt_ar: "مانجو على قماش",
  source: "licensed",
  author: "Fixture Studio",
  source_url: "https://localhost/source",
  licence: "Commercial use",
  licence_url: "https://localhost/licence",
  credit_required: true,
};

function markup(locale: Locale, row: ProducePhotoRow | undefined): string {
  return renderToStaticMarkup(
    <ProduceCard produce={mango()} photo={row} locale={locale} currentMonth={8} />,
  );
}

function attr(name: string, value: string): string {
  return `${name}="${value}"`;
}

function heading(html: string): string {
  return /<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(html)?.[1] ?? "";
}

function counterOpen(html: string): string {
  return /<\/h2>\s*<p\b([^>]*)>/.exec(html)?.[1] ?? "";
}

function hiddenFrames(html: string): string[] {
  return (html.match(/<div\b[^>]*>/g) ?? []).filter((tag) => tag.includes('aria-hidden="true"'));
}

it("renders the fallback card in the wrong locale, drops the season sentence, or adds a badge ring", () => {
  const arabic = markup("ar", undefined);
  expect(arabic).toContain('href="/ar/produce/mango"');
  expect(heading(arabic)).toBe("<bdi>مانجو</bdi>");
  expect(counterOpen(arabic)).toContain(attr("lang", "en"));
  expect(arabic).toContain("</h2><p");
  expect(/<\/h2>\s*<p\b[^>]*><bdi>Mango<\/bdi><\/p>/.test(arabic)).toBe(true);
  expect(arabic).toContain("فاكهة");
  expect(arabic).toContain("في الموسم: من يوليو إلى أكتوبر");
  expect(arabic).not.toContain("<img");
  expect(hiddenFrames(arabic)).toHaveLength(1);
  expect(arabic.match(/data-in="/g)?.length).toBe(12);
  expect(arabic.match(/<line\b/g)?.length).toBe(1);

  const english = markup("en", undefined);
  expect(english).toContain('href="/en/produce/mango"');
  expect(heading(english)).toBe("<bdi>Mango</bdi>");
  expect(counterOpen(english)).toContain(attr("lang", "ar"));
  expect(/<\/h2>\s*<p\b[^>]*><bdi>مانجو<\/bdi><\/p>/.test(english)).toBe(true);
  expect(english).toContain("Fruit");
  expect(english).toContain("In season: July \u2013 October");
  expect(english).not.toContain("<img");
  expect(hiddenFrames(english)).toHaveLength(1);
  expect(english.match(/data-in="/g)?.length).toBe(12);
});

it("drops the photograph, paints the tile as well as the badge, or draws a second ring", () => {
  const html = markup("en", photo);
  expect(html.match(/<img\b/g)?.length).toBe(1);
  expect(html).toContain('alt="Mango on linen"');
  expect(html).not.toContain("مانجو على قماش");
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('sizes="(min-width: 64rem) 25vw, 50vw"');
  expect(html).not.toContain('fetchpriority="high"');
  expect(html.match(/data-in="/g)?.length).toBe(12);
  expect(html.match(/<svg\b/g)?.length).toBe(1);
  expect(html.match(/<line\b/g)?.length).toBe(1);
  expect(hiddenFrames(html)).toHaveLength(0);
  expect(heading(html)).toBe("<bdi>Mango</bdi>");
  expect(html).toContain("In season: July \u2013 October");
});
