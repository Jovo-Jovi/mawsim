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
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing box");
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

type Catalogue = { pause: string; months: string[] };

function readCatalogue(locale: (typeof LOCALES)[number]): Catalogue {
  const catalogue = JSON.parse(readFileSync(path.join("src/i18n/messages", `${locale}.json`), "utf8")) as {
    home: { scenePause: string };
    months: Record<string, string>;
  };
  return {
    pause: catalogue.home.scenePause,
    months: Array.from({ length: 12 }, (_, index) => catalogue.months[String(index + 1)] ?? ""),
  };
}

async function sceneProbe(page: Page): Promise<{ webgl: boolean; cores: number }> {
  return page.evaluate(() => {
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      webgl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) !== null;
    } catch {
      webgl = false;
    }
    return { webgl, cores: navigator.hardwareConcurrency };
  });
}

function inlineStart(box: Box, locale: (typeof LOCALES)[number]): number {
  return locale === "en" ? box.x : box.x + box.width;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function settledMode(frame: Locator): Promise<string> {
  await expect(frame).toBeVisible();
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
      const drawn = await frame.getAttribute("data-scene-drawn");
      console.log(`reduced-motion ${locale} mode=${mode} canvas=${canvas} button=${button} drawn=${drawn}`);
      expect(mode).toBe("poster");
      expect(canvas).toBe(0);
      expect(button).toBe(0);
      expect(drawn).toBeNull();
      await expect(frame.locator("svg")).toBeVisible();
      expect(seen.errors).toEqual([]);
      expect(seen.foreign).toEqual([]);
      await context.close();
    });

    test("loads the scene at 360 and keeps the poster at 320", async ({ page }) => {
      const frame = page.locator("[data-hero-scene]");
      await page.setViewportSize({ width: 360, height: 900 });
      await page.goto(`/${locale}`);
      const probe = await sceneProbe(page);
      if (!probe.webgl || probe.cores < 3) {
        console.log(`width-360 ${locale} skipped: webgl=${probe.webgl} cores=${probe.cores}`);
      } else {
        const wide = await settledMode(frame);
        expect(wide).toBe("scene");
        await expect.poll(async () => frame.locator("canvas").count()).toBe(1);
        console.log(`width-360 ${locale} mode=${wide} canvas=${await frame.locator("canvas").count()}`);
      }

      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(`/${locale}`);
      const narrow = await settledMode(frame);
      const narrowCanvas = await frame.locator("canvas").count();
      const narrowButton = await frame.locator("button").count();
      const drawn = await frame.getAttribute("data-scene-drawn");
      console.log(
        `width-320 ${locale} mode=${narrow} canvas=${narrowCanvas} button=${narrowButton} drawn=${drawn}`,
      );
      expect(narrow).toBe("poster");
      expect(narrowCanvas).toBe(0);
      expect(narrowButton).toBe(0);
      expect(drawn).toBeNull();
      await expect(frame.locator("svg")).toBeVisible();
    });

    test("places the frame above the photograph at 1280 and below the dial at 390", async ({ page }) => {
      const frame = page.locator("[data-hero-scene]");
      const dial = page.locator("[data-season-dial]");
      const headline = page.locator("[data-texture-band='hero'] h1");
      const photo = page.locator("[data-hero-photo]");
      const caption = page.locator("[data-season-dial] + p");
      const guide = page.locator("[data-texture-band='hero'] a[href*='/guide']");
      const subject = page.locator("[data-hero-photo] img");

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${locale}`);
      const wideFrame = await boxOf(frame);
      const widePhoto = await boxOf(photo);
      const wideDial = await boxOf(dial);
      const wideHeadline = await boxOf(headline);
      const wideCaption = await boxOf(caption);
      const wideGuide = await boxOf(guide);
      const photoGap = widePhoto.y - (wideFrame.y + wideFrame.height);
      const guideGap = wideGuide.y - (wideCaption.y + wideCaption.height);
      const dialGap = wideDial.y - (wideFrame.y + wideFrame.height);
      const startDelta = Math.abs(inlineStart(wideFrame, locale) - inlineStart(widePhoto, locale));
      console.log(
        `layout-1280 ${locale} frame=${JSON.stringify(wideFrame)} photo=${JSON.stringify(widePhoto)} dial=${JSON.stringify(wideDial)} caption=${JSON.stringify(wideCaption)} guide=${JSON.stringify(wideGuide)} photoGap=${photoGap} guideGap=${guideGap} dialGap=${dialGap} startDelta=${startDelta}`,
      );
      expect(photoGap).toBeGreaterThanOrEqual(19);
      expect(photoGap).toBeLessThanOrEqual(21);
      expect(guideGap).toBeGreaterThanOrEqual(19);
      expect(guideGap).toBeLessThanOrEqual(21);
      expect(startDelta).toBeLessThanOrEqual(1);
      expect(dialGap).toBeLessThanOrEqual(64);
      expect(overlaps(wideFrame, wideHeadline)).toBe(false);
      expect(overlaps(wideFrame, widePhoto)).toBe(false);
      expect(overlaps(wideFrame, wideDial)).toBe(false);
      expect(overlaps(wideFrame, wideCaption)).toBe(false);
      expect(overlaps(wideFrame, wideGuide)).toBe(false);

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
      const { pause } = readCatalogue(locale);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/${locale}`);
      const probe = await sceneProbe(page);
      test.skip(!probe.webgl || probe.cores < 3, `scene skipped: webgl=${probe.webgl} cores=${probe.cores}`);

      const frame = page.locator("[data-hero-scene]");
      const before = await boxOf(frame);
      expect(await settledMode(frame)).toBe("scene");
      const canvas = frame.locator("canvas");
      await expect(canvas).toHaveCount(1);
      await expect.poll(async () => frame.getAttribute("data-scene-drawn")).toBe("");
      const visibility = await frame.locator("svg").evaluate((element) => getComputedStyle(element).visibility);
      const after = await boxOf(frame);
      const button = frame.getByRole("button", { name: pause, exact: true });
      const scene = frame.locator("[data-scene-rotation]");
      const nameBefore = (await button.textContent()) ?? "";
      await expect(button).toHaveAttribute("aria-pressed", "false");
      expect(nameBefore).toBe(pause);
      console.log(`drawn ${locale} visibility=${visibility} name-before=${nameBefore}`);
      expect(visibility).toBe("hidden");
      expect(after).toEqual(before);

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
      const nameHeld = (await button.textContent()) ?? "";
      expect(nameHeld).toBe(pause);
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
      const nameResumed = (await button.textContent()) ?? "";
      expect(nameResumed).toBe(pause);
      await expect.poll(async () => scene.getAttribute("data-scene-rotation")).not.toBe(held);

      console.log(
        `pause ${locale} before=${JSON.stringify(before)} after=${JSON.stringify(after)} name-held=${nameHeld} name-resumed=${nameResumed} pressed-then=${held} resumed=${await scene.getAttribute("data-scene-rotation")}`,
      );
    });

    test("keeps each catalogue month on one line", async ({ page }) => {
      const { months } = readCatalogue(locale);
      expect(months.filter((name) => name.length > 0)).toHaveLength(12);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${locale}`);
        await expect(page.locator("[data-hero-scene]")).toBeVisible();
        const span = page.locator("[data-texture-band='hero'] h1 span");
        const readings: string[] = [];
        for (const name of months) {
          const rects = await span.evaluate((element, monthName) => {
            const previous = element.textContent;
            element.textContent = monthName;
            const range = document.createRange();
            range.selectNodeContents(element);
            const count = range.getClientRects().length;
            element.textContent = previous;
            return count;
          }, name);
          readings.push(`${name}=${rects}`);
          expect(rects, `${locale} ${width} ${name}`).toBe(1);
        }
        console.log(`months ${locale} ${width} ${readings.join(" ")}`);
      }
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
