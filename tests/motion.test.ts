import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const srcRoot = path.resolve(import.meta.dirname, "../src");
const ALLOWED_KEYFRAMES = new Set(["draw", "settle", "rise", "grow"]);
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

it("catches a @keyframes name outside draw, settle, rise and grow", () => {
  const names: string[] = [];
  for (const { css } of stylesheets) {
    for (const match of css.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)) names.push(match[1]);
  }
  expect(names).toContain("draw");
  expect(names).toContain("settle");
  expect(names).toContain("rise");
  expect(names).toContain("grow");
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
  expect(seen.has("grow")).toBe(true);
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

function beforeBodies(css: string): string[] {
  const bodies: string[] = [];
  let from = 0;
  while (from < css.length) {
    const at = css.indexOf("::before", from);
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
    bodies.push(css.slice(open + 1, cursor - 1));
    from = cursor;
  }
  return bodies;
}

it("catches a ::before halo placed with a percentage translate or a physical left or right, which shifts the ring off centre in rtl", () => {
  const offenders: string[] = [];
  for (const name of CARD_MOTION) {
    for (const body of beforeBodies(sheet(name))) {
      for (const raw of body.split(";")) {
        const colon = raw.indexOf(":");
        if (colon === -1) continue;
        const prop = raw.slice(0, colon).trim().split(/\s+/).pop() ?? "";
        const value = raw.slice(colon + 1).trim();
        if ((prop === "left" || prop === "right") && value.length > 0) offenders.push(`${name} ${prop}`);
        if (prop === "translate" && value.includes("%")) offenders.push(`${name} translate`);
        if (prop === "transform" && /translate(?:3d|X|Y)?\(/.test(value) && value.includes("%")) {
          offenders.push(`${name} transform`);
        }
      }
    }
  }
  expect(sheet("modules/produce/ProducePhoto.module.css")).toContain(".dial::before");
  expect(sheet("modules/produce/ProduceCard.module.css")).toContain(".badge::before");
  expect(offenders).toEqual([]);
});

function cssFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...cssFiles(full));
    else if (entry.name.endsWith(".css")) found.push(full);
  }
  return found;
}

function ruleBodyAt(css: string, open: number): string {
  let depth = 0;
  for (let cursor = open; cursor < css.length; cursor += 1) {
    if (css[cursor] === "{") depth += 1;
    else if (css[cursor] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, cursor);
    }
  }
  return "";
}

function exactSelectorBodies(css: string, selector: string): string[] {
  const bodies: string[] = [];
  let from = 0;
  while (from < css.length) {
    const at = css.indexOf(selector, from);
    if (at === -1) break;
    const prev = at === 0 ? "\n" : css[at - 1];
    const next = css[at + selector.length] ?? "";
    const prevOk = /[\s,{]/.test(prev);
    const continues = next === ":" || next === "." || next === "[" || /[A-Za-z]/.test(next);
    if (prevOk && !continues) {
      const open = css.indexOf("{", at);
      if (open !== -1 && !css.slice(at + selector.length, open).includes("{")) bodies.push(ruleBodyAt(css, open));
    }
    from = at + selector.length;
  }
  return bodies;
}

const PILL_ARRIVALS = [
  ["modules/guide/KindChips.module.css", '.chip[aria-current="true"]'],
  ["modules/guide/MonthScroller.module.css", '.link[aria-current="true"] .label'],
] as const;

it("catches a selected pill animation whose reduced-motion block omits the aria-current rule, so the arrival animation keeps playing", () => {
  const bare: string[] = [];
  for (const [name, selector] of PILL_ARRIVALS) {
    const css = sheet(name);
    const reduced = blockAfter(css, "@media (prefers-reduced-motion: reduce)").join("\n");
    let outer = css;
    for (const block of blockAfter(css, "@media (prefers-reduced-motion: reduce)")) outer = outer.replace(block, "");
    const grows = exactSelectorBodies(outer, selector).some((body) => body.includes("animation-name: grow"));
    const stops = exactSelectorBodies(reduced, selector).some((body) => /\banimation\s*:\s*none\b/.test(body));
    if (!grows || !stops) bare.push(name);
  }
  expect(bare).toEqual([]);
});

it("catches a guide transition or keyframe that animates a property other than transform or opacity, besides the pills' colour transitions", () => {
  const allowedTransition =
    /^(?:transform|opacity|color|background-color)(?:\s*,\s*(?:transform|opacity|color|background-color))*$/;
  const offenders: string[] = [];
  for (const { file, css } of stylesheets) {
    const name = relative(file);
    if (!name.startsWith("modules/guide/")) continue;
    for (const match of css.matchAll(/transition-property\s*:\s*([^;]+)/g)) {
      const value = match[1].trim().replaceAll(/\s+/g, " ");
      if (!allowedTransition.test(value)) offenders.push(`${name} transition ${value}`);
    }
    for (const block of keyframeBodies(css)) {
      for (const match of block.body.matchAll(/(?:^|[\s;{])([a-zA-Z-]+)\s*:/g)) {
        if (match[1] !== "opacity" && match[1] !== "transform") offenders.push(`${name} ${block.name} ${match[1]}`);
      }
    }
  }
  expect(sheet("modules/guide/KindChips.module.css")).toContain("transition-property: background-color, color");
  expect(sheet("modules/guide/MonthScroller.module.css")).toContain("transition-property: background-color, color");
  expect(sheet("modules/guide/KindChips.module.css")).toContain("@keyframes grow");
  expect(sheet("modules/guide/MonthScroller.module.css")).toContain("@keyframes grow");
  expect(offenders).toEqual([]);
});

it("catches a raw scale() in a guide stylesheet, so a pill scale stays on the --pill-grow-from token", () => {
  const rawScale = /scale\(\s*(?!var\()/;
  const offenders: string[] = [];
  for (const { file, css } of stylesheets) {
    const name = relative(file);
    if (!name.startsWith("modules/guide/")) continue;
    if (rawScale.test(css)) offenders.push(name);
  }
  expect(sheet("modules/guide/KindChips.module.css")).toContain("scale(var(--pill-grow-from))");
  expect(sheet("modules/guide/MonthScroller.module.css")).toContain("scale(var(--pill-grow-from))");
  expect(offenders).toEqual([]);
});

it("catches a reveal stylesheet that hides a pending cell under reduced motion or animates a property other than transform and opacity", () => {
  const name = "modules/guide/Reveal.module.css";
  const css = sheet(name);
  const reducedBlocks = blockAfter(css, "@media (prefers-reduced-motion: reduce)");
  expect(reducedBlocks.length).toBeGreaterThan(0);
  const reduced = reducedBlocks.join("\n");
  expect(reduced).toContain("opacity: 1");
  expect(reduced).toContain("transform: none");
  expect(reduced).toContain("transition: none");
  expect(reduced).not.toContain("opacity: 0");

  let outer = css;
  for (const block of reducedBlocks) outer = outer.replace(block, "");
  expect(outer).toContain('data-reveal="pending"');
  expect(outer).toContain("opacity: 0");
  expect(outer).toContain("transform: translateY(var(--reveal-rise))");
  expect(outer).toContain("transition-property: opacity, transform");
  expect(outer).toContain("transition-duration: var(--dur-reveal)");
  expect(outer).toContain("transition-timing-function: var(--ease-out)");

  const allowed = /^(?:opacity|transform)(?:\s*,\s*(?:opacity|transform))?$/;
  const offenders: string[] = [];
  for (const match of css.matchAll(/transition-property\s*:\s*([^;]+)/g)) {
    const value = match[1].trim().replaceAll(/\s+/g, " ");
    if (value === "none") continue;
    if (!allowed.test(value)) offenders.push(value);
  }
  for (const block of keyframeBodies(css)) {
    for (const match of block.body.matchAll(/(?:^|[\s;{])([a-zA-Z-]+)\s*:/g)) {
      if (match[1] !== "opacity" && match[1] !== "transform") offenders.push(`${block.name} ${match[1]}`);
    }
  }
  expect(offenders).toEqual([]);
});

it("catches a home stylesheet that loops, animates something other than transform and opacity, or drops the scene control's reduced-motion block", () => {
  const home = stylesheets.filter(({ file }) => relative(file).startsWith("modules/home/"));
  const names = home.map(({ file }) => relative(file)).sort();
  expect(names).toContain("modules/home/HeroScene.module.css");
  expect(names).toContain("modules/home/Hero.module.css");
  expect(names).toContain("modules/home/SeasonDial.module.css");
  expect(home.filter(({ css }) => css.includes("infinite")).map(({ file }) => relative(file))).toEqual([]);

  const quiet = new Set(["opacity", "transform"]);
  const buttonColour = new Set(["color", "background-color"]);
  const offenders: string[] = [];
  for (const { file, css } of home) {
    const name = relative(file);
    const sceneSheet = name === "modules/home/HeroScene.module.css";
    for (const match of css.matchAll(/transition-property\s*:\s*([^;]+)/g)) {
      const value = match[1].trim().replaceAll(/\s+/g, " ");
      if (value === "none") continue;
      for (const prop of value.split(",").map((part) => part.trim())) {
        if (quiet.has(prop)) continue;
        if (sceneSheet && buttonColour.has(prop)) continue;
        offenders.push(`${name} transition ${prop}`);
      }
    }
    for (const block of keyframeBodies(css)) {
      if (block.name === "draw") continue;
      for (const match of block.body.matchAll(/(?:^|[\s;{])([a-zA-Z-]+)\s*:/g)) {
        if (!quiet.has(match[1])) offenders.push(`${name} ${block.name} ${match[1]}`);
      }
    }
  }
  expect(offenders).toEqual([]);

  const scene = sheet("modules/home/HeroScene.module.css");
  const active = [...scene.matchAll(/transition-property\s*:\s*([^;]+)/g)]
    .map((match) => match[1].trim())
    .filter((value) => value !== "none");
  expect(active.length).toBeGreaterThan(0);
  expect(scene).toContain("prefers-reduced-motion: reduce");
});

it("catches an infinite animation anywhere in a stylesheet, because a loop never stops", () => {
  const files = cssFiles(srcRoot).map((file) => relative(file)).sort();
  expect(files).toContain("styles/tokens.css");
  expect(files).toContain("app/globals.css");
  expect(files).toContain("modules/guide/KindChips.module.css");
  expect(files).toContain("modules/guide/MonthScroller.module.css");
  const looping = files.filter((file) => {
    const css = stripComments(readFileSync(path.join(srcRoot, file), "utf8"));
    return css.includes("infinite");
  });
  expect(looping).toEqual([]);
});
