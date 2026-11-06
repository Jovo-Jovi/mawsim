import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const LOCALES = ["ar", "en"] as const;
const WIDTHS = [390, 1280] as const;
const SLUGS = ["mango", "molokhia"] as const;

type LocaleCode = (typeof LOCALES)[number];
type Slug = (typeof SLUGS)[number];

/** Draw order from the fence, checked against the cells on screen. */
const DRAW_ORDER: Record<Slug, readonly number[]> = {
  mango: [7, 8, 9, 10],
  molokhia: [5, 6, 7, 8, 9],
};

type ProduceRow = {
  slug: string;
  months: number[];
};

type Catalogue = {
  nav: { guide: string };
};

type ArcSizes = {
  disc: number;
  font: number;
  minLabelGap: number;
  inside: number;
  tickClear: number;
  labelOffset: number;
  lit: number;
  labelCount: number;
  scrollWidth: number;
  clientWidth: number;
  root: number;
};

const produce = JSON.parse(readFileSync("content/produce.json", "utf8")) as ProduceRow[];

function monthsOf(slug: Slug): number[] {
  const row = produce.find((candidate) => candidate.slug === slug);
  if (!row) throw new Error(`${slug} is missing from content/produce.json`);
  return row.months;
}

function catalogue(locale: LocaleCode): Catalogue {
  return JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8")) as Catalogue;
}

function viewportFor(width: number): { width: number; height: number } {
  if (width === 1280) return { width, height: 900 };
  if (width === 390) return { width, height: 844 };
  return { width: 320, height: 700 };
}

function discFloor(width: number): number | null {
  if (width === 390) return 9;
  if (width === 1280) return 12;
  return null;
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

async function scrollToY(page: Page, top: number): Promise<void> {
  await page.evaluate((target) => {
    window.scrollTo({ top: target, left: 0, behavior: "instant" });
  }, top);
  await expect
    .poll(async () => page.evaluate((target) => Math.abs(window.scrollY - target) < 1, top))
    .toBe(true);
}

async function scrollToEnd(page: Page): Promise<number> {
  const maxScroll = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight),
  );
  await scrollToY(page, maxScroll);
  return maxScroll;
}

async function openProduce(page: Page, locale: LocaleCode, slug: Slug): Promise<void> {
  await page.goto(`/${locale}/produce/${slug}`);
  await page.locator("[data-arc-label]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
        const image = arc?.querySelector("img");
        const frame = image?.parentElement;
        return frame instanceof HTMLElement && frame.getBoundingClientRect().width > 0;
      }),
    )
    .toBe(true);
}

async function readScale(page: Page): Promise<number> {
  return page.evaluate(() => {
    const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
    const image = arc?.querySelector("img");
    if (!(image instanceof HTMLImageElement)) return Number.NaN;
    const style = getComputedStyle(image);
    const transform = style.transform;
    if (transform === "none") {
      if (style.scale && style.scale !== "none") {
        const parsed = Number.parseFloat(style.scale);
        return Number.isFinite(parsed) ? parsed : 1;
      }
      return 1;
    }
    const matrix = /matrix\(([^)]+)\)/.exec(transform);
    if (matrix?.[1]) {
      const [a, b] = matrix[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return Math.hypot(a ?? 1, b ?? 0);
    }
    const matrix3 = /matrix3d\(([^)]+)\)/.exec(transform);
    if (matrix3?.[1]) {
      const parts = matrix3[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return Math.hypot(parts[0] ?? Number.NaN, parts[1] ?? 0);
    }
    return Number.NaN;
  });
}

/** Wait until the scrubbed scale stops changing between frames. */
async function settleScale(page: Page): Promise<number> {
  let settled = Number.NaN;
  await expect
    .poll(
      async () => {
        const first = await readScale(page);
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
        const second = await readScale(page);
        settled = second;
        return Number.isFinite(first) && Number.isFinite(second) && Math.abs(first - second) < 0.0005;
      },
      { timeout: 8_000 },
    )
    .toBe(true);
  return settled;
}

async function waitUntilDrawn(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
          const tick = arc?.querySelector("[data-arc-tick]");
          if (!(arc instanceof HTMLElement) || !(tick instanceof Element)) return false;
          const opacity = Number.parseFloat(getComputedStyle(tick).opacity);
          const running = arc
            .getAnimations({ subtree: true })
            .some((animation) => animation.playState === "running");
          return opacity === 1 && !running;
        }),
      { timeout: 8_000 },
    )
    .toBe(true);
}

function fixed(value: number, digits: number): string {
  return value.toFixed(digits);
}

async function arcSizes(page: Page): Promise<ArcSizes> {
  return page.evaluate(() => {
    const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
    const ring = arc?.querySelector("svg");
    const line = arc?.querySelector("[data-arc-tick]");
    const image = arc?.querySelector("img");
    if (!(arc instanceof HTMLElement) || !(ring instanceof SVGSVGElement) || !(line instanceof SVGLineElement) || !(image instanceof HTMLImageElement)) {
      throw new Error("the season arc, its tick, or the photograph is missing");
    }
    let frame: Element | null = image.parentElement;
    while (frame && frame !== arc) {
      if (frame instanceof HTMLElement && Number.parseFloat(getComputedStyle(frame).borderTopWidth) > 0) break;
      frame = frame.parentElement;
    }
    if (!(frame instanceof HTMLElement)) throw new Error("the photograph frame is missing");

    const ringTransform = ring.getScreenCTM();
    const lineTransform = line.getScreenCTM();
    if (!ringTransform || !lineTransform) throw new Error("the ring has no screen transform");

    const toScreen = (transform: DOMMatrix, x: number, y: number) => {
      const point = ring.createSVGPoint();
      point.x = x;
      point.y = y;
      return point.matrixTransform(transform);
    };
    const centre = toScreen(ringTransform, 20, 20);
    const edge = toScreen(ringTransform, 40, 20);
    const ringRadius = Math.hypot(edge.x - centre.x, edge.y - centre.y);
    const inner = toScreen(lineTransform, line.x1.baseVal.value, line.y1.baseVal.value);
    const outer = toScreen(lineTransform, line.x2.baseVal.value, line.y2.baseVal.value);
    const innerDist = Math.hypot(inner.x - centre.x, inner.y - centre.y);
    const strokeUser = Number.parseFloat(getComputedStyle(line).strokeWidth);
    const halfScreen = (strokeUser / 2) * (ringRadius / 20);

    const frameBox = frame.getBoundingClientRect();
    const frameRadius = Math.min(frameBox.width, frameBox.height) / 2;
    const frameOffset = Math.hypot(
      frameBox.x + frameBox.width / 2 - centre.x,
      frameBox.y + frameBox.height / 2 - centre.y,
    );
    const tickClear = innerDist - halfScreen - frameOffset - frameRadius;

    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const arcBox = arc.getBoundingClientRect();
    const kindToken = getComputedStyle(document.documentElement)
      .getPropertyValue(`--color-kind-${arc.dataset.kind ?? ""}`)
      .trim();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const normalize = (value: string) => {
      if (!context) return value;
      context.fillStyle = "#000";
      context.fillStyle = value;
      return context.fillStyle;
    };
    const kindColor = normalize(kindToken);

    const textBoxes = [...arc.querySelectorAll("[data-arc-label]")].flatMap((label) => {
      const text = label.firstChild;
      if (!(text instanceof Text)) return [];
      const range = document.createRange();
      range.selectNodeContents(text);
      const rect = range.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return [];
      return [rect];
    });

    const gapRectToCircle = (rect: DOMRect, cx: number, cy: number, radius: number) => {
      const x = Math.max(rect.left, Math.min(cx, rect.right));
      const y = Math.max(rect.top, Math.min(cy, rect.bottom));
      return Math.hypot(x - cx, y - cy) - radius;
    };
    const gapRects = (a: DOMRect, b: DOMRect) => {
      const dx = Math.max(0, a.left - b.right, b.left - a.right);
      const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom);
      if (dx === 0 && dy === 0) {
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return -Math.min(overlapX, overlapY);
      }
      return Math.hypot(dx, dy);
    };
    const gapRectToBox = (rect: DOMRect) =>
      Math.min(rect.left - arcBox.left, arcBox.right - rect.right, rect.top - arcBox.top, arcBox.bottom - rect.bottom);
    const gapCircleToBox = (cx: number, cy: number, radius: number) =>
      Math.min(cx - radius - arcBox.left, arcBox.right - (cx + radius), cy - radius - arcBox.top, arcBox.bottom - (cy + radius));

    let minLabelGap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < textBoxes.length; i += 1) {
      const rect = textBoxes[i];
      if (!rect) continue;
      minLabelGap = Math.min(minLabelGap, gapRectToCircle(rect, centre.x, centre.y, ringRadius));
      minLabelGap = Math.min(minLabelGap, gapRectToCircle(rect, outer.x, outer.y, halfScreen));
      minLabelGap = Math.min(
        minLabelGap,
        gapRectToCircle(rect, frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2, frameRadius),
      );
      for (let j = i + 1; j < textBoxes.length; j += 1) {
        const other = textBoxes[j];
        if (!other) continue;
        minLabelGap = Math.min(minLabelGap, gapRects(rect, other));
      }
    }

    let inside = gapCircleToBox(centre.x, centre.y, ringRadius);
    inside = Math.min(inside, gapCircleToBox(outer.x, outer.y, halfScreen));
    inside = Math.min(
      inside,
      gapCircleToBox(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2, frameRadius),
    );
    for (const rect of textBoxes) {
      if (!rect) continue;
      inside = Math.min(inside, gapRectToBox(rect));
    }

    const direction = document.documentElement.dir === "rtl" ? -1 : 1;
    let labelOffset = 0;
    const labels = [...arc.querySelectorAll("[data-arc-label]")];
    labels.forEach((label, index) => {
      const text = label.firstChild;
      if (!(text instanceof Text)) return;
      const range = document.createRange();
      range.selectNodeContents(text);
      const rect = range.getBoundingClientRect();
      const dx = rect.x + rect.width / 2 - centre.x;
      const dy = rect.y + rect.height / 2 - centre.y;
      const actual = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const expected = direction * (index * 30 + 15);
      const delta = Math.abs(actual - expected) % 360;
      labelOffset = Math.max(labelOffset, Math.min(delta, 360 - delta));
    });

    const fontSizes = labels.flatMap((label) => {
      if (!(label instanceof HTMLElement)) return [];
      return [Number.parseFloat(getComputedStyle(label).fontSize)];
    });
    const font = fontSizes.every((size) => size === fontSizes[0]) ? (fontSizes[0] ?? Number.NaN) : Number.NaN;

    let lit = 0;
    for (const cell of arc.querySelectorAll("[data-calendar-month]")) {
      if (!(cell instanceof SVGPathElement)) continue;
      if (normalize(getComputedStyle(cell).stroke) === kindColor) lit += 1;
    }

    return {
      disc: frameBox.width / root,
      font,
      minLabelGap,
      inside,
      tickClear,
      labelOffset,
      lit,
      labelCount: textBoxes.length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      root,
    };
  });
}

function logSizes(locale: LocaleCode, width: number, slug: Slug, sizes: ArcSizes): void {
  console.log(
    `season-arc ${locale} ${width} ${slug} sizes disc=${fixed(sizes.disc, 2)} font=${fixed(sizes.font, 0)} minLabelGap=${fixed(sizes.minLabelGap, 2)} inside=${fixed(sizes.inside, 2)} tickClear=${fixed(sizes.tickClear, 2)} labelOffset=${fixed(sizes.labelOffset, 2)} lit=${sizes.lit}`,
  );
}

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    test(`draws the disc under the floor, overlaps a label, or rests the tick on the hairline (${locale} ${width})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewportFor(width));
      for (const slug of SLUGS) {
        await openProduce(page, locale, slug);
        const sizes = await arcSizes(page);
        logSizes(locale, width, slug, sizes);
        expect(sizes.labelCount).toBe(12);
        expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
        const floor = discFloor(width);
        if (floor === null) throw new Error(`no disc floor for ${width}`);
        expect(sizes.disc).toBeGreaterThanOrEqual(floor);
        expect(sizes.font).toBe(13);
        expect(sizes.minLabelGap).toBeGreaterThanOrEqual(sizes.root * 0.1);
        expect(sizes.inside).toBeGreaterThanOrEqual(sizes.root * 0.1);
        expect(sizes.tickClear).toBeGreaterThanOrEqual(sizes.root * 0.1);
        expect(sizes.labelOffset).toBeLessThanOrEqual(1.5);
        expect(sizes.lit).toBe(monthsOf(slug).length);
        expect(monthsOf(slug)).toEqual([...DRAW_ORDER[slug]]);
      }

      if (width !== 390) return;
      await page.setViewportSize(viewportFor(320));
      for (const slug of SLUGS) {
        await openProduce(page, locale, slug);
        const sizes = await arcSizes(page);
        logSizes(locale, 320, slug, sizes);
        expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
      }
    });

    test(`draws the season out of order, leaves the tick transparent, or redraws after a scroll (${locale} ${width})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewportFor(width));
      for (const slug of SLUGS) {
        await openProduce(page, locale, slug);
        await waitUntilDrawn(page);
        const reading = await page.evaluate(() => {
          const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
          const tick = arc?.querySelector("[data-arc-tick]");
          if (!(arc instanceof HTMLElement) || !(tick instanceof Element)) {
            return { order: [] as number[], opacity: Number.NaN };
          }
          const cells = [...arc.querySelectorAll("[data-in='true']")].flatMap((cell) => {
            if (!(cell instanceof SVGPathElement)) return [];
            const place = Number.parseInt(getComputedStyle(cell).getPropertyValue("--arc-draw-place"), 10);
            const calendarMonth = Number.parseInt(cell.dataset.calendarMonth ?? "", 10);
            return [{ place, calendarMonth }];
          });
          cells.sort((left, right) => left.place - right.place);
          return {
            order: cells.map((cell) => cell.calendarMonth),
            opacity: Number.parseFloat(getComputedStyle(tick).opacity),
          };
        });
        await page.evaluate(() => {
          const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
          const bucket: string[] = [];
          Object.assign(window, { __arcStarts: bucket });
          arc?.addEventListener("animationstart", (event) => {
            if (event instanceof AnimationEvent) bucket.push(event.animationName);
          });
        });
        await scrollToEnd(page);
        await scrollToY(page, 0);
        const again = await page.evaluate(() => {
          const bucket = (window as unknown as { __arcStarts?: string[] }).__arcStarts ?? [];
          return bucket.length;
        });
        console.log(
          `season-arc ${locale} ${width} draw cells=${reading.order.length} order=${reading.order.join(",")} tick=${fixed(reading.opacity, 0)} again=${again}`,
        );
        expect(reading.order).toEqual([...DRAW_ORDER[slug]]);
        expect(reading.opacity).toBe(1);
        expect(again).toBe(0);
      }
    });

    test(`starts the photograph above 1, misses the scroll zoom, or fails to return (${locale} ${width})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewportFor(width));
      await openProduce(page, locale, "mango");
      const zoom = await page.evaluate(() =>
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--zoom-scroll")),
      );
      expect(zoom).toBeGreaterThan(1);
      const start = await settleScale(page);
      const maxScroll = await scrollToEnd(page);
      const end = await settleScale(page);
      await scrollToY(page, 0);
      const back = await settleScale(page);
      console.log(
        `season-arc ${locale} ${width} zoom start=${fixed(start, 3)} end=${fixed(end, 3)} back=${fixed(back, 3)} maxScroll=${fixed(maxScroll, 1)}`,
      );
      expect(Math.abs(start - 1)).toBeLessThanOrEqual(0.0005);
      expect(Math.abs(end - zoom)).toBeLessThanOrEqual(0.005);
      expect(Math.abs(back - 1)).toBeLessThanOrEqual(0.0005);
    });

    test(`keeps scaling the photograph after the scroll has stopped (${locale} ${width})`, async ({ page }) => {
      await page.setViewportSize(viewportFor(width));
      await openProduce(page, locale, "mango");
      await scrollToEnd(page);
      await settleScale(page);
      const frames = await page.evaluate(
        () =>
          new Promise<number[]>((resolve) => {
            const reads: number[] = [];
            const take = () => {
              const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
              const image = arc?.querySelector("img");
              let scale = Number.NaN;
              if (image instanceof HTMLImageElement) {
                const transform = getComputedStyle(image).transform;
                if (transform === "none") scale = 1;
                else {
                  const matrix = /matrix\(([^)]+)\)/.exec(transform);
                  if (matrix?.[1]) {
                    const [a, b] = matrix[1].split(",").map((part) => Number.parseFloat(part.trim()));
                    scale = Math.hypot(a ?? 1, b ?? 0);
                  }
                }
              }
              reads.push(Math.round(scale * 1000) / 1000);
              if (reads.length === 30) resolve(reads);
              else requestAnimationFrame(take);
            };
            requestAnimationFrame(take);
          }),
      );
      console.log(`season-arc ${locale} ${width} still scale=${fixed(frames[0] ?? Number.NaN, 3)} frames=${frames.length}`);
      expect(frames).toHaveLength(30);
      expect(new Set(frames).size).toBe(1);
    });

    test(`shifts the layout while the arc draws or the page scrolls (${locale} ${width})`, async ({ page }) => {
      await page.addInitScript(() => {
        const bucket: number[] = [];
        Object.assign(window, { __arcShifts: bucket });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
            if (shift.hadRecentInput || typeof shift.value !== "number") continue;
            bucket.push(shift.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.setViewportSize(viewportFor(width));
      await openProduce(page, locale, "mango");
      await waitUntilDrawn(page);
      await scrollToEnd(page);
      await scrollToY(page, 0);
      const shift = await page.evaluate(() => {
        const bucket = (window as unknown as { __arcShifts?: number[] }).__arcShifts ?? [];
        return bucket.reduce((sum, value) => sum + value, 0);
      });
      console.log(`season-arc ${locale} ${width} shift=${shift}`);
      expect(shift).toBe(0);
    });

    test(`requests another origin or adds the lenis class (${locale} ${width})`, async ({ page }) => {
      const foreign: string[] = [];
      page.on("request", (request) => rememberForeign(request.url(), foreign));
      page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));
      await page.setViewportSize(viewportFor(width));
      await openProduce(page, locale, "mango");
      const lenis = await page.evaluate(() =>
        [...document.documentElement.classList].some((name) => name === "lenis" || name.startsWith("lenis-")),
      );
      console.log(`season-arc ${locale} ${width} origin=ok lenis=${lenis}`);
      expect(foreign).toEqual([]);
      expect(lenis).toBe(false);
    });

    test(`returns from the guide above scale 1 or short of the scroll zoom (${locale} ${width})`, async ({ page }) => {
      const copy = catalogue(locale);
      await page.setViewportSize(viewportFor(width));
      await openProduce(page, locale, "mango");
      const zoom = await page.evaluate(() =>
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--zoom-scroll")),
      );
      await page.locator("header").getByRole("link", { name: copy.nav.guide, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide(?:\\?.*)?$`));
      await page.goBack();
      await page.locator("[data-arc-label]").first().waitFor();
      await scrollToY(page, 0);
      const start = await settleScale(page);
      await scrollToEnd(page);
      const end = await settleScale(page);
      console.log(`season-arc ${locale} ${width} teardown start=${fixed(start, 3)} end=${fixed(end, 3)}`);
      expect(Math.abs(start - 1)).toBeLessThanOrEqual(0.0005);
      expect(Math.abs(end - zoom)).toBeLessThanOrEqual(0.005);
    });

    test(`reports an axe violation on the settled produce page (${locale} ${width})`, async ({ page }) => {
      await page.setViewportSize(viewportFor(width));
      await openProduce(page, locale, "mango");
      await waitUntilDrawn(page);
      const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      console.log(`season-arc ${locale} ${width} axe=${violations.violations.length}`);
      expect(violations.violations).toEqual([]);
    });
  }
}

test.describe("season arc under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`animates the arc, leaves a dash, or zooms the photograph when motion is reduced (${locale} ${width})`, async ({
        page,
      }) => {
        await page.setViewportSize(viewportFor(width));
        await openProduce(page, locale, "mango");
        await scrollToEnd(page);
        const reading = await page.evaluate(() => {
          const arc = document.querySelector("[data-arc-label]")?.closest("[data-kind]");
          const image = arc?.querySelector("img");
          if (!(arc instanceof HTMLElement) || !(image instanceof HTMLImageElement)) {
            return { animations: -1, offset: Number.NaN, scale: Number.NaN };
          }
          let offset = 0;
          for (const cell of arc.querySelectorAll("[data-in='true']")) {
            if (!(cell instanceof SVGPathElement)) continue;
            offset = Math.max(offset, Math.abs(Number.parseFloat(getComputedStyle(cell).strokeDashoffset) || 0));
          }
          const transform = getComputedStyle(image).transform;
          let scale = 1;
          if (transform !== "none") {
            const matrix = /matrix\(([^)]+)\)/.exec(transform);
            if (matrix?.[1]) {
              const [a, b] = matrix[1].split(",").map((part) => Number.parseFloat(part.trim()));
              scale = Math.hypot(a ?? 1, b ?? 0);
            }
          }
          return {
            animations: arc.getAnimations({ subtree: true }).length,
            offset,
            scale,
          };
        });
        console.log(
          `season-arc ${locale} ${width} reduced animations=${reading.animations} offset=${reading.offset} scale=${fixed(reading.scale, 3)}`,
        );
        expect(reading.animations).toBe(0);
        expect(reading.offset).toBe(0);
        expect(Math.abs(reading.scale - 1)).toBeLessThanOrEqual(0.0005);
      });
    }
  }
});

test.describe("season arc without javascript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`leaves the arc undrawn, scales the photograph, or drops a month from the text list without JavaScript (${locale} ${width})`, async ({
        page,
      }) => {
        await page.setViewportSize(viewportFor(width));
        await page.goto(`/${locale}/produce/mango`);
        await expect.poll(async () => page.locator("[data-arc-label]").count()).toBe(12);
        await expect(page.locator("[data-kind]:has([data-arc-label])")).toHaveCount(1);
        const reading = await page.evaluate(() => {
          const label = document.querySelector("[data-arc-label]");
          const arc = label?.closest("[data-kind]");
          const block = arc?.parentElement;
          const image = arc?.querySelector("img");
          if (!(arc instanceof HTMLElement) || !(image instanceof HTMLImageElement) || !(block instanceof HTMLElement)) {
            return { drawn: false, scale: Number.NaN, list: -1, hiddenSlot: false };
          }
          const cells = [...arc.querySelectorAll("[data-in='true']")];
          const drawn =
            cells.length > 0 &&
            cells.every((cell) => {
              const offset = Number.parseFloat(getComputedStyle(cell).strokeDashoffset);
              return !Number.isFinite(offset) || offset === 0;
            });
          const transform = getComputedStyle(image).transform;
          let scale = 1;
          if (transform !== "none") {
            const matrix = /matrix\(([^)]+)\)/.exec(transform);
            if (matrix?.[1]) {
              const [a, b] = matrix[1].split(",").map((part) => Number.parseFloat(part.trim()));
              scale = Math.hypot(a ?? 1, b ?? 0);
            }
          }
          return {
            drawn,
            scale,
            list: block.querySelectorAll("ol li").length,
            hiddenSlot: arc.closest("div[hidden][id^='S:']") !== null,
          };
        });
        console.log(
          `season-arc ${locale} ${width} nojs drawn=${reading.drawn} scale=${fixed(reading.scale, 3)} list=${reading.list} hiddenSlot=${reading.hiddenSlot}`,
        );
        expect(reading.hiddenSlot).toBe(false);
        expect(reading.drawn).toBe(true);
        expect(Math.abs(reading.scale - 1)).toBeLessThanOrEqual(0.0005);
        expect(reading.list).toBe(12);
      });
    }
  }
});
