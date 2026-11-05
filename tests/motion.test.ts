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
