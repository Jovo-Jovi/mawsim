import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LOCALES = ["en", "ar"] as const;

type Box = { x: number; y: number; width: number; height: number };

function sceneChunkFiles(): string[] {
  const root = path.resolve(".next/static");
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js") && readFileSync(full, "utf8").includes("WebGLRenderer")) {
        found.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  walk(root);
  return found;
}

function scriptSources(html: string): string[] {
  return [...html.matchAll(/<script\b[^>]*\ssrc=["']([^"']+)["']/g)].map((match) => match[1] ?? "");
}

function frameMarkup(html: string): string {
  const at = html.indexOf("data-hero-scene");
  if (at < 0) throw new Error("first HTML has no data-hero-scene");
  const open = html.lastIndexOf("<div", at);
  const tag = /<\/?div\b[^>]*>/g;
  tag.lastIndex = open;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return html.slice(open, tag.lastIndex);
    } else {
      depth += 1;
    }
  }
  throw new Error("data-hero-scene frame is unclosed");
}

function rememberForeign(raw: string, foreign: string[]): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    foreign.push(raw);
    return;
  }
  if (url.protocol === "data:" || url.protocol === "blob:" || url.protocol === "about:") return;
  if (url.hostname !== "127.0.0.1") foreign.push(raw);
}

function watch(page: Page): { errors: string[]; foreign: string[] } {
  const errors: string[] = [];
  const foreign: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => rememberForeign(request.url(), foreign));
  page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));
  return { errors, foreign };
}

async function installShift(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const holder = window as Window & { __mawsimShift?: number };
    holder.__mawsimShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (shift.hadRecentInput) continue;
        holder.__mawsimShift = (holder.__mawsimShift ?? 0) + (shift.value ?? 0);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function shiftSum(page: Page): Promise<number> {
  return page.evaluate(() => (window as Window & { __mawsimShift?: number }).__mawsimShift ?? 0);
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing box");
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function settledMode(frame: Locator): Promise<string> {
  await expect.poll(async () => frame.getAttribute("data-scene-mode")).toMatch(/^(scene|poster)$/);
  return (await frame.getAttribute("data-scene-mode")) ?? "";
}

test("first HTML is the poster and does not list the scene chunk", async ({ request }) => {
  const chunks = sceneChunkFiles();
  expect(chunks.length).toBeGreaterThan(0);
  for (const locale of LOCALES) {
    const response = await request.get(`/${locale}`);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    const frame = frameMarkup(html);
    const scripts = scriptSources(html);
    const listed = scripts.filter((src) => chunks.some((chunk) => src.includes(chunk.split("/").pop() ?? chunk)));
    console.log(
      `first-html ${locale} poster=${frame.includes("<svg")} canvas=${frame.includes("<canvas")} button=${frame.includes("<button")} scene-chunks=${chunks.join(",")} listed=${listed.length}`,
    );
    expect(frame).toContain("<svg");
    expect(frame).toContain("data-hero-scene");
    expect(frame).not.toContain("<canvas");
    expect(frame).not.toContain("<button");
    expect(html).not.toContain("<canvas");
    expect(listed).toEqual([]);
  }
});

for (const locale of LOCALES) {
  test.describe(locale, () => {
    test("keeps the poster under reduced motion", async ({ browser }) => {
      const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const seen = watch(page);
      await page.goto(`/${locale}`);
      const frame = page.locator("[data-hero-scene]");
      const mode = await settledMode(frame);
      const canvas = await frame.locator("canvas").count();
      const button = await frame.locator("button").count();
      console.log(`reduced-motion ${locale} mode=${mode} canvas=${canvas} button=${button}`);
      expect(mode).toBe("poster");
      expect(canvas).toBe(0);
      expect(button).toBe(0);
      await expect(frame.locator("svg")).toBeVisible();
      expect(seen.errors).toEqual([]);
      expect(seen.foreign).toEqual([]);
      await context.close();
    });

    test("loads the scene at 360 and keeps the poster at 320", async ({ page }) => {
      const frame = page.locator("[data-hero-scene]");
      await page.setViewportSize({ width: 360, height: 900 });
      await page.goto(`/${locale}`);
      const wide = await settledMode(frame);
      expect(wide).toBe("scene");
      await expect.poll(async () => frame.locator("canvas").count()).toBe(1);
      console.log(`width-360 ${locale} mode=${wide} canvas=${await frame.locator("canvas").count()}`);

      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(`/${locale}`);
      const narrow = await settledMode(frame);
      const narrowCanvas = await frame.locator("canvas").count();
      const narrowButton = await frame.locator("button").count();
      console.log(`width-320 ${locale} mode=${narrow} canvas=${narrowCanvas} button=${narrowButton}`);
      expect(narrow).toBe("poster");
      expect(narrowCanvas).toBe(0);
      expect(narrowButton).toBe(0);
      await expect(frame.locator("svg")).toBeVisible();
    });

    test("places the frame beside the dial at 1280 and below it at 390", async ({ page }) => {
      const frame = page.locator("[data-hero-scene]");
      const dial = page.locator("[data-season-dial]");
      const headline = page.locator("[data-texture-band='hero'] h1");
      const subject = page.locator("[data-texture-band='hero'] div[data-kind]");

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${locale}`);
      const wideFrame = await boxOf(frame);
      const wideDial = await boxOf(dial);
      const wideHeadline = await boxOf(headline);
      const wideSubject = await boxOf(subject);
      console.log(
        `layout-1280 ${locale} frame=${JSON.stringify(wideFrame)} dial=${JSON.stringify(wideDial)}`,
      );
      expect(overlaps(wideFrame, wideHeadline)).toBe(false);
      expect(overlaps(wideFrame, wideSubject)).toBe(false);
      const beside = Math.min(wideFrame.y + wideFrame.height, wideDial.y + wideDial.height) - Math.max(wideFrame.y, wideDial.y);
      expect(beside).toBeGreaterThan(0);
      const gap = locale === "en"
        ? wideDial.x - (wideFrame.x + wideFrame.width)
        : wideFrame.x - (wideDial.x + wideDial.width);
      expect(gap).toBeGreaterThan(-16);
      expect(gap).toBeLessThan(48);

      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`/${locale}`);
      const narrowFrame = await boxOf(frame);
      const narrowDial = await boxOf(dial);
      const narrowHeadline = await boxOf(headline);
      const narrowSubject = await boxOf(subject);
      console.log(
        `layout-390 ${locale} frame=${JSON.stringify(narrowFrame)} dial=${JSON.stringify(narrowDial)}`,
      );
      expect(narrowFrame.y).toBeGreaterThan(narrowDial.y + narrowDial.height - 1);
      expect(overlaps(narrowFrame, narrowHeadline)).toBe(false);
      expect(overlaps(narrowFrame, narrowSubject)).toBe(false);
    });

    test("pauses the turn without moving the frame", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${locale}`);
      const probe = await page.evaluate(() => {
        let webgl = false;
        try {
          const canvas = document.createElement("canvas");
          webgl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) !== null;
        } catch {
          webgl = false;
        }
        return { webgl, cores: navigator.hardwareConcurrency };
      });
      test.skip(!probe.webgl || probe.cores < 3, `scene skipped: webgl=${probe.webgl} cores=${probe.cores}`);

      const frame = page.locator("[data-hero-scene]");
      const before = await boxOf(frame);
      expect(await settledMode(frame)).toBe("scene");
      const canvas = frame.locator("canvas");
      await expect(canvas).toHaveCount(1);
      const after = await boxOf(frame);
      const button = frame.getByRole("button");
      const scene = frame.locator("[data-scene-rotation]");
      await expect(button).toHaveAttribute("aria-pressed", "false");

      await expect.poll(async () => {
        const start = await scene.getAttribute("data-scene-rotation");
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
        );
        return (await scene.getAttribute("data-scene-rotation")) !== start;
      }).toBe(true);

      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      const held = await scene.getAttribute("data-scene-rotation");
      await expect.poll(async () => {
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
        );
        return scene.getAttribute("data-scene-rotation");
      }).toBe(held);

      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "false");
      await expect.poll(async () => scene.getAttribute("data-scene-rotation")).not.toBe(held);

      console.log(
        `pause ${locale} before=${JSON.stringify(before)} after=${JSON.stringify(after)} pressed-then=${held} resumed=${await scene.getAttribute("data-scene-rotation")}`,
      );
      expect(after).toEqual(before);
    });

    test("stays on this origin, shifts nothing, and has no axe violations", async ({ page }) => {
      const seen = watch(page);
      await installShift(page);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${locale}`);
      const frame = page.locator("[data-hero-scene]");
      const mode = await settledMode(frame);
      if (mode === "scene") await expect.poll(async () => frame.locator("canvas").count()).toBe(1);
      await page.evaluate(async () => {
        if (document.fonts) await document.fonts.ready;
      });
      const shift = await shiftSum(page);
      const axe = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      console.log(
        `proof ${locale} shift=${shift} axe=${axe.violations.length} errors=${seen.errors.length} foreign=${seen.foreign.length}`,
      );
      if (axe.violations.length > 0) console.log(axe.violations.map((item) => item.id).join(","));
      expect(shift).toBe(0);
      expect(axe.violations).toEqual([]);
      expect(seen.errors).toEqual([]);
      expect(seen.foreign).toEqual([]);
    });
  });
}
