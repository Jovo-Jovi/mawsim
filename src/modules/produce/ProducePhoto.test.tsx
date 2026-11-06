import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import type { ProduceKind } from "../../domain";
import { listProduce, type Produce } from "./catalogue";
import { ProducePhoto } from "./ProducePhoto";
import type { ProducePhotoRow } from "./photos";

function produceOf(kind: ProduceKind): Produce {
  const found = listProduce().find((row) => row.kind === kind);
  if (!found) throw new Error("missing produce kind");
  return found;
}

const fruit = produceOf("fruit");
const vegetable = produceOf("vegetable");
const leafy = produceOf("leafy");

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

function markup(locale: Locale, slot: "card" | "page" | "hero", row: ProducePhotoRow | undefined, priority?: boolean) {
  const produce = row ? fruit : fruit;
  return renderToStaticMarkup(
    <ProducePhoto produce={produce} photo={row} locale={locale} slot={slot} priority={priority} />,
  );
}

function frameClass(html: string): string {
  const match = /^<div class="([^"]*)"/.exec(html);
  return match?.[1] ?? "";
}

function langAttribute(locale: Locale): string {
  return `lang="${locale}"`;
}

it("renders no image, the wrong alt, or the wrong pixel size when a photograph is present", () => {
  const arabic = markup("ar", "card", photo, true);
  const english = markup("en", "card", photo, true);
  expect(arabic.match(/<img\b/g)?.length).toBe(1);
  expect(english.match(/<img\b/g)?.length).toBe(1);
  expect(arabic).toContain('alt="مانجو على قماش"');
  expect(english).toContain('alt="Mango on linen"');
  expect(arabic).toContain('width="1800"');
  expect(arabic).toContain('height="1400"');
  expect(arabic).toContain(encodeURIComponent(photo.file));
  expect(arabic).toContain('sizes="(min-width: 64rem) 20vw, 40vw"');
});

it("lazy-loads a photograph marked priority", () => {
  const html = markup("en", "hero", photo, true);
  expect(html).not.toContain('loading="lazy"');
  expect(html).toContain('sizes="100vw"');
});

it("omits lazy loading when a photograph is not priority", () => {
  const card = markup("en", "card", photo, false);
  const page = markup("en", "page", photo, false);
  expect(card).toContain('loading="lazy"');
  expect(card).toContain('sizes="(min-width: 64rem) 20vw, 40vw"');
  expect(page).toContain('sizes="(min-width: 64rem) 50vw, 100vw"');
});

it("renders an image, drops a name, or draws an inner ring on the card fallback", () => {
  const html = markup("ar", "card", undefined);
  expect(html).not.toContain("<img");
  expect(html).toContain(fruit.ar);
  expect(html).toContain(fruit.en);
  expect(html).not.toContain("<svg");
  expect(html).not.toContain("data-in=");
  expect(html).not.toContain("<line");
  expect(html).not.toContain("dir=");
});

it("paints the wrong kind or hardcodes lang on the frame", () => {
  for (const produce of [fruit, vegetable, leafy]) {
    const html = renderToStaticMarkup(
      <ProducePhoto produce={produce} photo={undefined} locale="en" slot="page" />,
    );
    expect(html).toContain(`data-kind="${produce.kind}"`);
    expect(html).toContain(produce.en);
    expect(html.match(/lang="[^"]*"/g)).toEqual([langAttribute("ar")]);
    expect(html.startsWith("<div")).toBe(true);
    expect(/^<div[^>]*>/.exec(html)?.[0]).not.toContain("lang=");
    expect(html.match(/<svg\b/g)?.length).toBe(1);
    expect(html).toContain("A 18.3 18.3 0 0 1");
  }
  const arabic = markup("ar", "page", undefined);
  expect(arabic.match(/lang="[^"]*"/g)).toEqual([langAttribute("en")]);
  const hero = markup("en", "hero", undefined);
  expect(hero).not.toContain("<img");
  expect(hero.match(/data-in="/g)?.length).toBe(12);
  expect(hero.match(/<svg\b/g)?.length).toBe(1);
});

it("uses a different frame class for the photograph and the fallback", () => {
  const cardPhoto = markup("en", "card", photo);
  const cardFallback = markup("en", "card", undefined);
  const heroFallback = markup("en", "hero", undefined);
  expect(frameClass(cardPhoto)).toBe(frameClass(cardFallback));
  expect(frameClass(cardPhoto).length).toBeGreaterThan(0);
  expect(frameClass(heroFallback)).not.toBe(frameClass(cardFallback));
  const frameCss = readFileSync(new URL("./ProducePhoto.module.css", import.meta.url), "utf8");
  expect(frameCss).toContain("aspect-ratio: 4 / 3");
  expect(frameCss).toContain("aspect-ratio: 3 / 2");
  expect(frameCss).toContain("aspect-ratio: 4 / 5");
  expect(frameCss).toContain("aspect-ratio: 5 / 4");
  expect(frameCss).toContain("min-width: 40rem");
  expect(frameCss).toContain("object-fit: cover");
  const ringCss = readFileSync(new URL("./SeasonRing.module.css", import.meta.url), "utf8");
  expect(ringCss).toContain(":dir(rtl)");
  expect(ringCss).toContain("scaleX(-1)");
});
