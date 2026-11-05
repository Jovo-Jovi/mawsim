import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const srcRoot = path.resolve(import.meta.dirname, "../src");
const ALLOWED_KEYFRAMES = new Set(["draw", "settle", "rise"]);
const QUIET_PROPERTIES = new Set(["opacity", "transform"]);
const MOTION_DECLARATION =
  /(?:^|[\s;{])(animation-name|animation|transition-property|transition)\s*:\s*([^;]+)/g;

function moduleStylesheets(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...moduleStylesheets(full));
    else if (entry.name.endsWith(".module.css")) found.push(full);
  }
  return found;
}

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function relative(file: string): string {
  return path.relative(srcRoot, file).replaceAll("\\", "/");
}

function keyframeBodies(css: string): { name: string; body: string }[] {
  const blocks: { name: string; body: string }[] = [];
  for (const match of css.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let cursor = start;
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === "{") depth += 1;
      else if (css[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    blocks.push({ name: match[1], body: css.slice(start, cursor - 1) });
  }
  return blocks;
}

const stylesheets = moduleStylesheets(srcRoot).map((file) => ({
  file,
  css: stripComments(readFileSync(file, "utf8")),
}));

it("catches a looping module stylesheet, because its source contains infinite", () => {
  const read = stylesheets.map(({ file }) => relative(file)).sort();
  expect(read).toContain("modules/home/SeasonDial.module.css");
  expect(read).toContain("modules/guide/CardGrid.module.css");
  expect(read).toContain("modules/produce/ProduceCard.module.css");
  expect(read).toContain("modules/guide/KindChips.module.css");
  expect(read).toContain("modules/guide/MonthScroller.module.css");
  const looping = stylesheets.filter(({ css }) => css.includes("infinite")).map(({ file }) => relative(file));
  expect(looping).toEqual([]);
});

it("catches a @keyframes name outside draw, settle and rise", () => {
  const names: string[] = [];
  for (const { css } of stylesheets) {
    for (const match of css.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)) names.push(match[1]);
  }
  expect(names).toContain("draw");
  expect(names).toContain("settle");
  expect(names.filter((name) => !ALLOWED_KEYFRAMES.has(name))).toEqual([]);
});

it("catches animation or transition other than none without a prefers-reduced-motion reduce block", () => {
  const bare: string[] = [];
  for (const { file, css } of stylesheets) {
    const active: string[] = [];
    for (const match of css.matchAll(MOTION_DECLARATION)) {
      if (match[2].trim() !== "none") active.push(match[1]);
    }
    if (active.length > 0 && !css.includes("prefers-reduced-motion: reduce")) bare.push(relative(file));
  }
  expect(bare).toEqual([]);
});

it("catches a @keyframes other than draw that animates a property other than opacity and transform", () => {
  const offenders: string[] = [];
  const seen = new Set<string>();
  for (const { css } of stylesheets) {
    for (const block of keyframeBodies(css)) {
      seen.add(block.name);
      if (block.name === "draw") continue;
      for (const match of block.body.matchAll(/(?:^|[\s;{])([a-zA-Z-]+)\s*:/g)) {
        if (!QUIET_PROPERTIES.has(match[1])) offenders.push(`${block.name} ${match[1]}`);
      }
    }
  }
  expect(seen.has("settle")).toBe(true);
  expect(offenders).toEqual([]);
});

const CARD_MOTION = [
  "modules/produce/ProduceCard.module.css",
  "modules/produce/ProducePhoto.module.css",
  "modules/produce/SeasonRing.module.css",
] as const;

function sheet(name: string): string {
  const found = stylesheets.find((entry) => relative(entry.file) === name);
  if (!found) throw new Error(`missing stylesheet ${name}`);
  return found.css;
}

function blockAfter(css: string, needle: string): string[] {
  const blocks: string[] = [];
  let from = 0;
  while (from < css.length) {
    const at = css.indexOf(needle, from);
    if (at === -1) break;
    const open = css.indexOf("{", at);
    let depth = 0;
    let cursor = open;
    for (; cursor < css.length; cursor += 1) {
      if (css[cursor] === "{") depth += 1;
      else if (css[cursor] === "}") {
        depth -= 1;
        if (depth === 0) {
          cursor += 1;
          break;
        }
      }
    }
    blocks.push(css.slice(open, cursor));
    from = cursor;
  }
  return blocks;
}

function outsideHoverMedia(css: string): string {
  const needle = "@media (hover: hover)";
  let rest = css;
  let from = 0;
  while (from < rest.length) {
    const at = rest.indexOf(needle, from);
    if (at === -1) break;
    const open = rest.indexOf("{", at);
    let depth = 0;
    let cursor = open;
    for (; cursor < rest.length; cursor += 1) {
      if (rest[cursor] === "{") depth += 1;
      else if (rest[cursor] === "}") {
        depth -= 1;
        if (depth === 0) {
          cursor += 1;
          break;
        }
      }
    }
    rest = rest.slice(0, at) + rest.slice(cursor);
    from = at;
  }
  return rest;
}

it("catches a new transition-property that animates something other than transform or opacity", () => {
  const allowed = /^(?:transform|opacity)(?:\s*,\s*(?:transform|opacity))?$/;
  const offenders: string[] = [];
  let lift = 0;
  for (const name of CARD_MOTION) {
    const css = sheet(name);
    for (const match of css.matchAll(/transition-property\s*:\s*([^;]+)/g)) {
      const value = match[1].trim().replaceAll(/\s+/g, " ");
      if (value === "transform, box-shadow") {
        lift += 1;
        if (name !== "modules/produce/ProduceCard.module.css") offenders.push(`${name} ${value}`);
      } else if (!allowed.test(value)) {
        offenders.push(`${name} ${value}`);
      }
    }
  }
  expect(lift).toBe(1);
  expect(offenders).toEqual([]);
});

it("catches a :hover rule outside @media (hover: hover)", () => {
  const bare: string[] = [];
  for (const name of CARD_MOTION) {
    const css = outsideHoverMedia(sheet(name));
    const quiet = blockAfter(css, "@media (prefers-reduced-motion: reduce)").reduce(
      (rest, block) => rest.replace(block, ""),
      css,
    );
    if (quiet.includes(":hover")) bare.push(name);
  }
  const cardHover = blockAfter(sheet("modules/produce/ProduceCard.module.css"), "@media (hover: hover)").join("\n");
  const photoHover = blockAfter(sheet("modules/produce/ProducePhoto.module.css"), "@media (hover: hover)").join("\n");
  expect(cardHover).toContain(":hover");
  expect(cardHover).toContain("rotateY(var(--tilt-card))");
  expect(photoHover).toContain(":hover");
  expect(photoHover).toContain("scale(var(--zoom-photo))");
  expect(bare).toEqual([]);
});

it("catches a moving card stylesheet whose reduced-motion block omits transform none or glow opacity 0", () => {
  const moves = CARD_MOTION.filter((name) => {
    const css = sheet(name);
    return css.includes("var(--tilt-card)") || css.includes("var(--zoom-photo)") || css.includes("var(--glow-ring-opacity)");
  });
  const bare: string[] = [];
  for (const name of moves) {
    const blocks = blockAfter(sheet(name), "@media (prefers-reduced-motion: reduce)");
    const joined = blocks.join("\n");
    if (!joined.includes("transform: none") || !joined.includes("opacity: 0")) bare.push(name);
  }
  expect(moves).toContain("modules/produce/ProduceCard.module.css");
  expect(moves).toContain("modules/produce/ProducePhoto.module.css");
  expect(bare).toEqual([]);
});

it("catches a tilt that is not var(--tilt-card) or whose rtl twin keeps the same sign", () => {
  const css = sheet("modules/produce/ProduceCard.module.css");
  const withoutRtl = css.replaceAll(/:dir\(rtl\)[^{]*\{[^}]*\}/g, "");
  expect(css).toContain("rotateY(var(--tilt-card))");
  expect(css).toContain("rotateY(calc(var(--tilt-card) * -1))");
  expect(withoutRtl).toContain("rotateY(var(--tilt-card))");
  expect(withoutRtl).not.toContain("rotateY(calc(var(--tilt-card) * -1))");
});

it("catches a raw angle, scale or colour in the card motion stylesheets", () => {
  const rawAngle = /(?<![\w-])\d+(?:\.\d+)?(?:deg|rad|grad|turn)\b/;
  const rawScale = /scale\(\s*(?!var\()/;
  const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/;
  const offenders: string[] = [];
  for (const name of CARD_MOTION) {
    const css = sheet(name);
    if (rawAngle.test(css) || rawScale.test(css) || rawColour.test(css)) offenders.push(name);
  }
  const photo = sheet("modules/produce/ProducePhoto.module.css");
  expect(photo).toContain("scale(var(--zoom-photo))");
  expect(photo).not.toMatch(/\.hero[^{]*\{[^}]*scale\(/);
  expect(photo).not.toMatch(/\.page[^{]*\{[^}]*scale\(/);
  expect(offenders).toEqual([]);
});
