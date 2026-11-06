import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MarketTexture } from "./MarketTexture";
import type { ProducePhotoRow } from "./photos";

const photo: ProducePhotoRow = {
  key: "texture",
  file: "/photos/texture/linen.jpg",
  width: 1024,
  height: 1024,
  alt_en: "Linen weave",
  alt_ar: "نسيج كتاني",
  source: "licensed",
  author: "Fixture Studio",
  source_url: "https://localhost/source",
  licence: "Commercial use",
  licence_url: "https://localhost/licence",
  credit_required: false,
};

function visibleText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
}

function walkCss(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkCss(full));
    else if (entry.name.endsWith(".css")) found.push(full);
  }
  return found;
}

it("renders an image, a style attribute, tabindex, or readable text when no photograph is passed", () => {
  const html = renderToStaticMarkup(<MarketTexture photo={undefined} />);
  expect(html.startsWith("<div")).toBe(true);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("<pattern");
  expect(html).toContain("var(--texture-ink)");
  expect(html).toContain("var(--texture-tile)");
  expect(html).not.toContain("<img");
  expect(html).not.toContain("alt=");
  expect(html).not.toContain("style=");
  expect(html).not.toContain("tabindex");
  expect(html).not.toContain("<text");
  expect(html).not.toContain("<image");
  expect(html).not.toContain("href=");
  expect(visibleText(html)).toBe("");
});

it("drops the file path, draws a pattern, or exposes text when a photograph is passed", () => {
  const html = renderToStaticMarkup(<MarketTexture photo={photo} />);
  const src = /<img\b[^>]*\ssrc="([^"]*)"/.exec(html)?.[1] ?? "";
  const file = new URL(src.replaceAll("&amp;", "&"), "http://localhost").searchParams.get("url");
  expect(html).toContain("<img");
  expect(html).toContain('alt=""');
  expect(file).toBe("/photos/texture/linen.jpg");
  expect(html).toContain('sizes="100vw"');
  expect(html).toContain('loading="lazy"');
  expect(html).not.toContain("<svg");
  expect(html).not.toContain("<pattern");
  expect(html).not.toContain("tabindex");
  expect(html).not.toContain("Linen weave");
  expect(html).not.toContain("نسيج كتاني");
  expect(visibleText(html)).toBe("");
});

it("changes a showcase token or sets texture opacity to anything but 0.08", () => {
  const srcRoot = path.resolve(import.meta.dirname, "../..");
  const tokens = readFileSync(path.join(srcRoot, "styles/tokens.css"), "utf8");
  const darkAt = tokens.indexOf("prefers-color-scheme: dark");
  const light = tokens.slice(0, darkAt);
  const dark = tokens.slice(darkAt);
  expect(light).toContain("--dur-reveal: 560ms;");
  expect(light).toContain("--reveal-rise: 1rem;");
  expect(light).toContain("--reveal-stagger: 60ms;");
  expect(light).toContain("--zoom-photo: 1.05;");
  expect(light).toContain("--tilt-card: 1.5deg;");
  expect(light).toContain("--glow-ring-opacity: 0.55;");
  expect(light).toContain("--glow-ring-spread: 0.5rem;");
  expect(light).toContain("--texture-opacity: 0.08;");
  expect(light).toContain("--texture-ink: #1F2A22;");
  expect(light).toContain("--texture-tile: 12rem;");
  expect(dark).toContain("--texture-ink: #F3EBDD;");
  expect(dark).not.toContain("--texture-opacity:");
  const values: string[] = [];
  for (const file of walkCss(srcRoot)) {
    const css = readFileSync(file, "utf8");
    for (const match of css.matchAll(/--texture-opacity\s*:\s*([^;]+)/g)) values.push(match[1].trim());
  }
  expect(values).toEqual(["0.08"]);
});

it("animates the texture, drops object-fit cover, or paints the layer above the band", () => {
  const css = readFileSync(new URL("./MarketTexture.module.css", import.meta.url), "utf8");
  expect(css).not.toContain("animation");
  expect(css).not.toContain("transition");
  expect(css).toContain("object-fit: cover");
  expect(css).toContain("pointer-events: none");
  expect(css).toContain("opacity: var(--texture-opacity)");
  expect(css).toContain("z-index: -1");
  expect(css).toContain("position: absolute");
});
