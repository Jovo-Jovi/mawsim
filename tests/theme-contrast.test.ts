import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

const TEXT = 4.5;
const NON_TEXT = 3;

type Rgba = { r: number; g: number; b: number; a: number };

type ContrastPair = {
  breakName: string;
  fg: string;
  ground: string;
  minimum: number;
  hold: boolean;
};

const pairs: ContrastPair[] = [
  { breakName: "body ink on the page ground", fg: "--color-ink", ground: "--color-bg", minimum: TEXT, hold: true },
  { breakName: "body ink on a card surface", fg: "--color-ink", ground: "--color-surface", minimum: TEXT, hold: true },
  { breakName: "body ink on the sample-data track", fg: "--color-ink", ground: "--color-track", minimum: TEXT, hold: true },
  { breakName: "muted ink on the page ground", fg: "--color-ink-muted", ground: "--color-bg", minimum: TEXT, hold: true },
  { breakName: "muted ink on a card surface", fg: "--color-ink-muted", ground: "--color-surface", minimum: TEXT, hold: true },
  { breakName: "muted ink on the sample-data track", fg: "--color-ink-muted", ground: "--color-track", minimum: TEXT, hold: true },
  { breakName: "a link on the page ground", fg: "--color-primary", ground: "--color-bg", minimum: TEXT, hold: true },
  { breakName: "a link on a card surface", fg: "--color-primary", ground: "--color-surface", minimum: TEXT, hold: true },
  { breakName: "this-month text on the page ground", fg: "--color-accent", ground: "--color-bg", minimum: TEXT, hold: true },
  { breakName: "this-month text on a card surface", fg: "--color-accent", ground: "--color-surface", minimum: TEXT, hold: true },
  { breakName: "text on the pressed pill", fg: "--color-on-primary", ground: "--color-primary", minimum: TEXT, hold: true },
  { breakName: "text on the current-month tag", fg: "--color-on-highlight", ground: "--color-highlight", minimum: TEXT, hold: true },
  { breakName: "the focus ring on the page ground", fg: "--color-primary", ground: "--color-bg", minimum: NON_TEXT, hold: true },
  { breakName: "the focus ring on a card surface", fg: "--color-primary", ground: "--color-surface", minimum: NON_TEXT, hold: true },
  { breakName: "fruit fill on a card surface", fg: "--color-kind-fruit", ground: "--color-surface", minimum: NON_TEXT, hold: true },
  { breakName: "vegetable fill on a card surface", fg: "--color-kind-vegetable", ground: "--color-surface", minimum: NON_TEXT, hold: true },
  { breakName: "leafy fill on a card surface", fg: "--color-kind-leafy", ground: "--color-surface", minimum: NON_TEXT, hold: true },
  { breakName: "the this-month tick on a card surface", fg: "--color-accent", ground: "--color-surface", minimum: NON_TEXT, hold: true },
  { breakName: "the this-month tick on the empty track", fg: "--color-accent", ground: "--color-track", minimum: NON_TEXT, hold: true },
  { breakName: "fruit fill against the empty track", fg: "--color-kind-fruit", ground: "--color-track", minimum: NON_TEXT, hold: false },
  { breakName: "vegetable fill against the empty track", fg: "--color-kind-vegetable", ground: "--color-track", minimum: NON_TEXT, hold: false },
  { breakName: "leafy fill against the empty track", fg: "--color-kind-leafy", ground: "--color-track", minimum: NON_TEXT, hold: false },
];

const themes = ["light", "dark"] as const;

function balanced(source: string, braceIndex: number): string {
  let depth = 0;
  for (let index = braceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceIndex + 1, index);
    }
  }
  return "";
}

function bodyAfter(selector: string, source: string): string {
  const at = source.indexOf(selector);
  if (at < 0) return "";
  const brace = source.indexOf("{", at);
  if (brace < 0) return "";
  return balanced(source, brace);
}

function declarations(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of block.matchAll(/(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1] ?? "", (match[2] ?? "").trim());
  }
  return found;
}

function rootBody(): string {
  const match = /(?:^|\n):root\s*\{/.exec(css);
  if (!match) return "";
  return balanced(css, match.index + match[0].length - 1);
}

function mediaDarkBody(): string {
  const media = bodyAfter("@media (prefers-color-scheme: dark)", css);
  return bodyAfter(':root:not([data-theme="light"])', media);
}

const rootDecls = declarations(rootBody());
const mediaDecls = declarations(mediaDarkBody());
const darkDecls = declarations(bodyAfter(':root[data-theme="dark"]', css));

function parseColor(value: string): Rgba {
  const hex = /^#([\dA-Fa-f]{6})$/.exec(value.trim());
  if (hex) {
    const digits = hex[1] ?? "";
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(value.trim());
  if (!rgb) throw new Error(`unparsed colour ${value}`);
  const alphaRaw = rgb[4];
  let alpha = 1;
  if (alphaRaw) alpha = alphaRaw.endsWith("%") ? Number.parseFloat(alphaRaw) / 100 : Number.parseFloat(alphaRaw);
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: alpha,
  };
}

function composite(fg: Rgba, ground: Rgba): Rgba {
  const base =
    ground.a >= 1
      ? ground
      : { r: ground.r * ground.a, g: ground.g * ground.a, b: ground.b * ground.a, a: 1 };
  if (fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  return {
    r: fg.r * fg.a + base.r * (1 - fg.a),
    g: fg.g * fg.a + base.g * (1 - fg.a),
    b: fg.b * fg.a + base.b * (1 - fg.a),
    a: 1,
  };
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(fg: Rgba, ground: Rgba): number {
  const painted = composite(fg, ground);
  const lighterOf = (color: Rgba) => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  const fgLum = lighterOf(painted);
  const groundLum = lighterOf(ground.a >= 1 ? ground : composite(ground, { r: 0, g: 0, b: 0, a: 1 }));
  const lighter = Math.max(fgLum, groundLum);
  const darker = Math.min(fgLum, groundLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function tokenValue(theme: (typeof themes)[number], name: string): string {
  const light = rootDecls.get(name);
  const dark = darkDecls.get(name);
  const media = mediaDecls.get(name);
  if (!light || !dark || !media) throw new Error(`missing ${name}`);
  if (dark !== media) throw new Error(`dark blocks differ on ${name}`);
  return theme === "light" ? light : dark;
}

function ratioOf(theme: (typeof themes)[number], fg: string, ground: string): number {
  return contrastRatio(parseColor(tokenValue(theme, fg)), parseColor(tokenValue(theme, ground)));
}

it("scores black on white as anything but 21:1", () => {
  expect(contrastRatio({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toBe(21);
});

it("treats a half-black film on white as opaque black", () => {
  const filmed = composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
  expect(filmed).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
});

it("reads the hairline as opaque ink instead of compositing it over the surface", () => {
  const filmed = composite(parseColor(tokenValue("light", "--color-hairline")), parseColor(tokenValue("light", "--color-surface")));
  expect(filmed.r).toBeCloseTo(223.64, 2);
  expect(filmed.g).toBeCloseTo(220.02, 2);
  expect(filmed.b).toBeCloseTo(211.16, 2);
  expect(filmed.a).toBe(1);
});

for (const theme of themes) {
  for (const pair of pairs) {
    const title = pair.hold
      ? `lets ${pair.breakName} fall below ${pair.minimum}:1 in ${theme}`
      : `drops the report of ${pair.breakName} in ${theme}`;
    it(title, () => {
      const ratio = ratioOf(theme, pair.fg, pair.ground);
      if (!pair.hold) {
        const line = `contrast-report ${theme} ${pair.fg} / ${pair.ground} ${ratio.toFixed(2)}:1 not-held`;
        process.stdout.write(`${line}\n`);
        expect(Number.isFinite(ratio)).toBe(true);
        return;
      }
      expect(ratio, `${pair.fg} / ${pair.ground} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(pair.minimum);
    });
  }
}
