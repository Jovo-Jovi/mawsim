import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { dialViewBoxSize, ringBandWidth } from "./dial-geometry";
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

function elementByAttribute(html: string, attribute: string): string {
  const at = html.indexOf(attribute);
  if (at < 0) return "";
  const open = html.lastIndexOf("<", at);
  const tag = /^<([a-z0-9]+)/i.exec(html.slice(open))?.[1] ?? "div";
  const contentStart = html.indexOf(">", open) + 1;
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  let depth = 1;
  let cursor = contentStart;
  while (cursor < html.length && depth > 0) {
    const nextOpen = html.indexOf(openTag, cursor);
    const nextClose = html.indexOf(closeTag, cursor);
    if (nextClose < 0) return "";
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + openTag.length;
    } else {
      depth -= 1;
      if (depth === 0) return html.slice(contentStart, nextClose);
      cursor = nextClose + closeTag.length;
    }
  }
  return "";
}

it("renders the fallback card in the wrong locale, drops a name, or omits the season ring", () => {
  const arabic = markup("ar", undefined);
  const arabicCircle = elementByAttribute(arabic, "data-photo-circle");
  const arabicRing = elementByAttribute(arabic, "data-season-ring");
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
  expect(arabic.match(/<svg\b/g)?.length).toBe(1);
  expect(arabicCircle).toContain("مانجو");
  expect(arabicCircle).toContain("Mango");
  expect(arabicCircle).not.toContain("<svg");
  expect(arabicRing).toContain("<svg");
  expect(arabicRing).not.toContain("<img");

  const english = markup("en", undefined);
  const englishCircle = elementByAttribute(english, "data-photo-circle");
  expect(english).toContain('href="/en/produce/mango"');
  expect(heading(english)).toBe("<bdi>Mango</bdi>");
  expect(counterOpen(english)).toContain(attr("lang", "ar"));
  expect(/<\/h2>\s*<p\b[^>]*><bdi>مانجو<\/bdi><\/p>/.test(english)).toBe(true);
  expect(english).toContain("Fruit");
  expect(english).toContain("In season: July \u2013 October");
  expect(english).not.toContain("<img");
  expect(hiddenFrames(english)).toHaveLength(1);
  expect(english.match(/data-in="/g)?.length).toBe(12);
  expect(englishCircle).toContain("Mango");
  expect(englishCircle).toContain("مانجو");
  expect(englishCircle).not.toContain("<svg");
  expect(elementByAttribute(english, "data-season-ring")).toContain("<svg");
});

it("drops the photograph, draws the season ring inside the photo circle, or draws a second ring", () => {
  const html = markup("en", photo);
  const circle = elementByAttribute(html, "data-photo-circle");
  const ring = elementByAttribute(html, "data-season-ring");
  expect(html.match(/<img\b/g)?.length).toBe(1);
  expect(html).toContain('alt="Mango on linen"');
  expect(html).not.toContain("مانجو على قماش");
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('sizes="(min-width: 64rem) 20vw, 40vw"');
  expect(html).not.toContain('fetchpriority="high"');
  expect(html.match(/data-in="/g)?.length).toBe(12);
  expect(html.match(/<svg\b/g)?.length).toBe(1);
  expect(html.match(/<line\b/g)?.length).toBe(1);
  expect(hiddenFrames(html)).toHaveLength(0);
  expect(heading(html)).toBe("<bdi>Mango</bdi>");
  expect(html).toContain("In season: July \u2013 October");
  expect(circle).toContain("<img");
  expect(circle).not.toContain("<svg");
  expect(circle).not.toContain("data-in=");
  expect(circle).not.toContain("<line");
  expect(ring).toContain("<svg");
  expect(ring).not.toContain("<img");
});

it("insets the photo circle by a share of the frame other than the ring band", () => {
  const css = readFileSync(new URL("./ProduceCard.module.css", import.meta.url), "utf8");
  const declared = [...css.matchAll(/inset:\s*calc\(([0-9.]+)%\s*\+\s*var\(--ring-inset\)\)/g)];
  expect(declared).toHaveLength(1);
  const stated = Number(declared[0]?.[1]);
  const bandShare = (ringBandWidth / dialViewBoxSize) * 100;
  expect(stated).toBe(bandShare);
});
