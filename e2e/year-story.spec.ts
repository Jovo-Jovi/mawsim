import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const LOCALES = ["ar", "en"] as const;
const WIDTHS = [1280, 390] as const;
const STEPS = [1, 6, 11] as const;

type LocaleCode = (typeof LOCALES)[number];

type ProduceRow = {
  slug: string;
  months: number[];
};

type Catalogue = {
  home: {
    headline: string;
    guideLink: string;
    storyCount: string;
  };
  skip: { content: string };
  months: Record<string, string>;
};

const produce = JSON.parse(readFileSync("content/produce.json", "utf8")) as ProduceRow[];

function catalogue(locale: LocaleCode): Catalogue {
  return JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8")) as Catalogue;
}

function setFor(month: number): string[] {
  return produce.filter((row) => row.months.includes(month)).map((row) => row.slug);
}

function monthAfter(start: number, offset: number): number {
  return ((start - 1 + offset) % 12) + 1;
}

function cairoMonth(now = new Date()): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", month: "numeric" })
    .formatToParts(now)
    .find((item) => item.type === "month");
  const month = Number(part?.value);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("cairo month is outside 1-12");
  return month;
}

function sentence(locale: LocaleCode, month: number): string {
  const copy = catalogue(locale);
  const numeral = new Intl.NumberFormat(locale).format(setFor(month).length);
  return copy.home.storyCount.replaceAll("{month}", copy.months[String(month)] ?? "").replaceAll("{count}", numeral);
}

function angleDelta(actual: number, expected: number): number {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return 999;
  const delta = Math.abs(actual - expected) % 360;
  return Math.min(delta, 360 - delta);
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
}

async function storyScroll(page: Page): Promise<{ start: number; step: number }> {
  const metrics = await page.evaluate(() => {
    const band = document.querySelector("[data-texture-band='hero']");
    if (!(band instanceof HTMLElement)) return null;
    const start = band.getBoundingClientRect().top + window.scrollY;
    const step = (band.offsetHeight - window.innerHeight) / 11;
    return { start, step };
  });
  if (!metrics) throw new Error("the year story band is missing");
  return metrics;
}

async function labelAngle(page: Page, month: number): Promise<number> {
  return page.evaluate((index) => {
    const turn = document.querySelector("[data-dial-turn]");
    const label = document.querySelectorAll("[data-dial-label]")[index];
    if (!(turn instanceof HTMLElement) || !(label instanceof HTMLElement)) return Number.NaN;
    const dial = turn.getBoundingClientRect();
    const box = label.getBoundingClientRect();
    const dx = box.x + box.width / 2 - (dial.x + dial.width / 2);
    const dy = box.y + box.height / 2 - (dial.y + dial.height / 2);
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }, month - 1);
}

async function dialRotation(page: Page): Promise<number> {
  return page.locator("[data-dial-turn]").evaluate((node) => {
    const transform = getComputedStyle(node).transform;
    if (transform === "none") return 0;
    const match = /matrix\(([^)]+)\)/.exec(transform);
    if (!match?.[1]) return Number.NaN;
    const [a, b] = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
    return (Math.atan2(b ?? 0, a ?? 1) * 180) / Math.PI;
  });
}

async function waitForAngle(page: Page, month: number, expected: number): Promise<number> {
  await expect
    .poll(async () => angleDelta(await labelAngle(page, month), expected), { timeout: 8_000 })
    .toBeLessThanOrEqual(2);
  await expect
    .poll(
      async () => {
        const first = await dialRotation(page);
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
        const second = await dialRotation(page);
        return Number.isFinite(first) && Number.isFinite(second) && Math.abs(first - second) < 0.05;
      },
      { timeout: 8_000 },
    )
    .toBe(true);
  const angle = await labelAngle(page, month);
  expect(angleDelta(angle, expected)).toBeLessThanOrEqual(2);
  return angle;
}

async function visibleSlotText(page: Page, slot: "month" | "count"): Promise<string[]> {
  return page.locator(`[data-story-slot="${slot}"]`).evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      if (!(node instanceof HTMLElement)) return [];
      if (node.closest('[aria-hidden="true"]')) return [];
      const opacity = Number.parseFloat(getComputedStyle(node).opacity);
      if (opacity < 0.99) return [];
      return [(node.textContent ?? "").replace(/\s+/g, " ").trim()];
    }),
  );
}

async function forwardSlugs(page: Page): Promise<string[]> {
  return page.locator("[data-story-produce]").evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      if (!(node instanceof HTMLElement)) return [];
      const opacity = Number.parseFloat(getComputedStyle(node).opacity);
      const transform = getComputedStyle(node).transform;
      let scale = 1;
      if (transform !== "none") {
        const match = /matrix\(([^)]+)\)/.exec(transform);
        if (match?.[1]) {
          const [a, b] = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
          scale = Math.hypot(a ?? 1, b ?? 0);
        }
      }
      if (opacity < 0.99 || scale < 0.99) return [];
      return [node.dataset.storyProduce ?? ""];
    }),
  );
}

async function headerClearance(page: Page): Promise<{ heading: number; object: number; link: number }> {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const heading = document.querySelector("h1");
    const link = document.querySelector("main a[href*='guide?month=']");
    let object = document.querySelector("[data-dial-turn]")?.parentElement ?? null;
    while (object && object.querySelector("[data-story-produce]") === null) object = object.parentElement;
    if (!(header instanceof HTMLElement) || !(heading instanceof HTMLElement) || !(object instanceof HTMLElement) || !(link instanceof HTMLElement)) {
      return { heading: -1, object: -1, link: -1 };
    }
    const edge = header.getBoundingClientRect().bottom;
    return {
      heading: heading.getBoundingClientRect().top - edge,
      object: object.getBoundingClientRect().top - edge,
      link: link.getBoundingClientRect().top - edge,
    };
  });
}

async function bandAgainstStage(page: Page): Promise<{
  hiddenSlot: boolean;
  height: string;
  band: number;
  stage: number;
  inline: string[];
  lenis: boolean;
  htmlStyle: string;
}> {
  return page.evaluate(() => {
    const band = document.querySelector("[data-texture-band='hero']");
    const stage = band instanceof HTMLElement
      ? [...band.children].find((node) => node instanceof HTMLElement && node.getAttribute("aria-hidden") !== "true")
      : null;
    if (!(band instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
      return { hiddenSlot: false, height: "", band: -1, stage: -1, inline: ["missing"], lenis: false, htmlStyle: "" };
    }
    const inline: string[] = [];
    for (const node of band.querySelectorAll("[data-dial-turn], [data-dial-label], [data-story-produce], [data-story-slot]")) {
      if (!(node instanceof HTMLElement)) continue;
      const name = node.getAttribute("data-story-produce") ?? node.getAttribute("data-story-slot") ?? node.tagName;
      if (node.style.transform) inline.push(`${name}:transform`);
      if (node.style.opacity) inline.push(`${name}:opacity`);
      if (node.style.scale) inline.push(`${name}:scale`);
      if (node.style.willChange) inline.push(`${name}:will-change`);
    }
    return {
      hiddenSlot: band.closest("div[hidden][id^='S:']") !== null,
      height: getComputedStyle(band).height,
      band: band.getBoundingClientRect().height,
      stage: stage.getBoundingClientRect().height,
      inline,
      lenis: [...document.documentElement.classList].some((name) => name === "lenis" || name.startsWith("lenis-")),
      htmlStyle: document.documentElement.getAttribute("style") ?? "",
    };
  });
}

async function stillRotations(page: Page): Promise<number[]> {
  return page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const reads: number[] = [];
        const take = () => {
          const node = document.querySelector("[data-dial-turn]");
          const transform = node instanceof HTMLElement ? getComputedStyle(node).transform : "none";
          let rotation = 0;
          if (transform !== "none") {
            const match = /matrix\(([^)]+)\)/.exec(transform);
            if (match?.[1]) {
              const [a, b] = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
              rotation = (Math.atan2(b ?? 0, a ?? 1) * 180) / Math.PI;
            }
          }
          reads.push(Math.round(rotation * 1000) / 1000);
          if (reads.length === 30) resolve(reads);
          else requestAnimationFrame(take);
        };
        requestAnimationFrame(take);
      }),
  );
}

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    test(`leaves a month short of 12 o'clock, names another month, or opens the guide on the wrong month (${locale} ${width})`, async ({
      page,
    }) => {
      const copy = catalogue(locale);
      const foreign: string[] = [];
      page.on("request", (request) => rememberForeign(request.url(), foreign));
      page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));
      await page.addInitScript(() => {
        const bucket: number[] = [];
        Object.assign(window, { __storyShifts: bucket });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
            if (shift.hadRecentInput || typeof shift.value !== "number") continue;
            bucket.push(shift.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto(`/${locale}`);
      await page.locator("[data-dial-label]").first().waitFor();

      const href = await page.locator("main a[href*='guide?month=']").getAttribute("href");
      const initial = Number(new URL(href ?? "", "http://127.0.0.1").searchParams.get("month"));
      expect(initial).toBeGreaterThanOrEqual(1);
      expect(initial).toBeLessThanOrEqual(12);

      const { start, step } = await storyScroll(page);
      expect(step).toBeGreaterThan(100);
      const clearedAtRest = await headerClearance(page);
      expect(Math.min(clearedAtRest.heading, clearedAtRest.object, clearedAtRest.link)).toBeGreaterThanOrEqual(-0.5);
      console.log(
        `year-story ${locale} ${width} header k=0 heading=${clearedAtRest.heading.toFixed(1)} object=${clearedAtRest.object.toFixed(1)} link=${clearedAtRest.link.toFixed(1)}`,
      );
      const beforeSign = locale === "ar" ? -1 : 1;
      const dialStep = await page.evaluate(() =>
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dial-step")),
      );
      expect(dialStep).toBeGreaterThan(0);

      for (let k = 1; k <= 11; k += 1) {
        const month = monthAfter(initial, k);
        if (!STEPS.includes(k as (typeof STEPS)[number])) {
          await scrollToY(page, start + k * step);
          continue;
        }
        await scrollToY(page, start + (k - 1) * step);
        const before = await waitForAngle(page, month, beforeSign * dialStep);
        await scrollToY(page, start + k * step);
        const at = await waitForAngle(page, month, 0);
        await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
          `${copy.home.headline} ${copy.months[String(month)]}`,
        );
        expect(await visibleSlotText(page, "month")).toEqual([copy.months[String(month)] ?? ""]);
        expect(await visibleSlotText(page, "count")).toEqual([sentence(locale, month)]);
        expect((await forwardSlugs(page)).sort()).toEqual(setFor(month).sort());
        console.log(
          `year-story ${locale} ${width} k=${k} month=${month} before=${before.toFixed(2)} at=${at.toFixed(2)} forward=${setFor(month).join(",")}`,
        );
        if (k === 6) {
          const cleared = await headerClearance(page);
          expect(Math.min(cleared.heading, cleared.object, cleared.link)).toBeGreaterThanOrEqual(-0.5);
          console.log(
            `year-story ${locale} ${width} header k=6 heading=${cleared.heading.toFixed(1)} object=${cleared.object.toFixed(1)} link=${cleared.link.toFixed(1)}`,
          );
        }
        if (k === 11) {
          let frames: number[] = [];
          await expect
            .poll(
              async () => {
                frames = await stillRotations(page);
                return new Set(frames).size;
              },
              { timeout: 8_000 },
            )
            .toBe(1);
          console.log(`year-story ${locale} ${width} still rotation=${frames[0]} frames=${frames.length}`);
        }
      }

      await scrollToY(page, start);
      await expect
        .poll(async () => page.evaluate((target) => Math.abs(window.scrollY - target) < 1, start))
        .toBe(true);
      const shift = await page.evaluate(() => {
        const bucket = (window as unknown as { __storyShifts?: number[] }).__storyShifts ?? [];
        return bucket.reduce((sum, value) => sum + value, 0);
      });
      expect(shift).toBe(0);
      console.log(`year-story ${locale} ${width} shift=${shift}`);

      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(`/${locale}`);
      await page.locator("[data-dial-label]").first().waitFor();
      const narrow = await storyScroll(page);
      await scrollToY(page, narrow.start + 11 * narrow.step);
      await waitForAngle(page, monthAfter(initial, 11), 0);
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth <= root.clientWidth;
          }),
        )
        .toBe(true);
      const widths = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      console.log(`year-story ${locale} ${width} at320 scrollWidth=${widths.scrollWidth} clientWidth=${widths.clientWidth}`);

      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const k of STEPS) {
        const month = monthAfter(initial, k);
        await page.goto(`/${locale}`);
        await page.locator("[data-dial-label]").first().waitFor();
        const again = await storyScroll(page);
        await scrollToY(page, again.start + k * again.step);
        await waitForAngle(page, month, 0);
        await page.getByRole("link", { name: copy.home.guideLink, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=${month}$`));
        console.log(`year-story ${locale} ${width} k=${k} landed=${page.url()}`);
      }

      expect(foreign).toEqual([]);
      console.log(`year-story ${locale} ${width} origin=ok`);
    });
  }
}

test.describe("year story under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`reserves the story length, advances the month, paints an inline motion style, or adds the lenis class when motion is reduced (${locale} ${width})`, async ({
        page,
      }) => {
        const month = cairoMonth();
        const copy = catalogue(locale);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto(`/${locale}`);
        await page.locator("[data-dial-label]").first().waitFor();
        const href = await page.locator("main a[href*='guide?month=']").getAttribute("href");
        expect(href).toBe(`/${locale}/guide?month=${month}`);

        const settled = await bandAgainstStage(page);
        expect(settled.hiddenSlot).toBe(false);
        expect(Math.abs(settled.band - settled.stage)).toBeLessThanOrEqual(0.5);
        expect(settled.inline).toEqual([]);
        expect(settled.lenis).toBe(false);

        await scrollToY(page, await page.evaluate(() => document.documentElement.scrollHeight));
        await expect.poll(async () => page.evaluate(() => window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1)).toBe(true);
        const after = await bandAgainstStage(page);
        expect(Math.abs(after.band - after.stage)).toBeLessThanOrEqual(0.5);
        expect(after.inline).toEqual([]);
        expect(after.lenis).toBe(false);
        expect(await page.locator("main a[href*='guide?month=']").getAttribute("href")).toBe(href);
        expect(await visibleSlotText(page, "month")).toEqual([copy.months[String(month)] ?? ""]);
        expect(await visibleSlotText(page, "count")).toEqual([sentence(locale, month)]);
        expect((await forwardSlugs(page)).sort()).toEqual(setFor(month).sort());
        const angle = await labelAngle(page, month);
        expect(angleDelta(angle, 0)).toBeLessThanOrEqual(2);
        console.log(
          `year-story ${locale} ${width} reduced band=${settled.band.toFixed(1)} stage=${settled.stage.toFixed(1)} month=${month} angle=${angle.toFixed(2)} inline=0 lenis=false`,
        );
      });
    }
  }
});

test.describe("year story without javascript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`reserves the story length, shows another month, or points the guide away from this month without JavaScript (${locale} ${width})`, async ({
        page,
      }) => {
        const month = cairoMonth();
        const copy = catalogue(locale);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto(`/${locale}`);
        const band = page.locator("[data-texture-band='hero']");
        await expect.poll(async () => band.count()).toBe(1);
        await expect(band.locator("> :not([aria-hidden='true'])").first()).toBeAttached();

        const reading = await bandAgainstStage(page);
        console.log(
          `year-story ${locale} ${width} nojs hiddenSlot=${reading.hiddenSlot} height=${reading.height} band=${reading.band.toFixed(1)} stage=${reading.stage.toFixed(1)}`,
        );
        expect(reading.band).toBeGreaterThan(0);
        expect(reading.stage).toBeGreaterThan(0);
        expect(reading.hiddenSlot).toBe(false);
        expect(Math.abs(reading.band - reading.stage)).toBeLessThanOrEqual(0.5);
        expect(reading.inline).toEqual([]);
        expect(reading.lenis).toBe(false);

        expect(await page.locator("main a[href*='guide?month=']").getAttribute("href")).toBe(`/${locale}/guide?month=${month}`);
        expect(await visibleSlotText(page, "month")).toEqual([copy.months[String(month)] ?? ""]);
        expect(await visibleSlotText(page, "count")).toEqual([sentence(locale, month)]);
        expect((await forwardSlugs(page)).sort()).toEqual(setFor(month).sort());
      });
    }
  }
});

test.describe("year story keyboard with lenis", () => {
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`skips past the skip link, leaves the top of main out of view, or ignores PageDown from step 6 (${locale} ${width})`, async ({
        page,
      }) => {
        const copy = catalogue(locale);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto(`/${locale}`);
        await page.locator("[data-dial-label]").first().waitFor();
        await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(true);

        const href = await page.locator("main a[href*='guide?month=']").getAttribute("href");
        const initial = Number(new URL(href ?? "", "http://127.0.0.1").searchParams.get("month"));
        const { start, step } = await storyScroll(page);
        const month = monthAfter(initial, 6);
        await scrollToY(page, start + 6 * step);
        await waitForAngle(page, month, 0);

        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: copy.skip.content, exact: true })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect
          .poll(async () =>
            page.evaluate(() => {
              const main = document.querySelector("main");
              const active = document.activeElement;
              if (!(main instanceof HTMLElement) || !(active instanceof HTMLElement)) return false;
              const top = main.getBoundingClientRect().top;
              return (active === main || main.contains(active)) && top >= -1 && top < window.innerHeight;
            }),
          )
          .toBe(true);
        const placed = await page.evaluate(() => {
          const main = document.querySelector("main");
          return main instanceof HTMLElement ? main.getBoundingClientRect().top : Number.NaN;
        });
        const before = await page.evaluate(() => window.scrollY);
        await page.keyboard.press("PageDown");
        await expect.poll(async () => page.evaluate((startY) => window.scrollY > startY + 1, before)).toBe(true);
        const after = await page.evaluate(() => window.scrollY);
        console.log(
          `year-story ${locale} ${width} keyboard skip=focused mainTop=${placed.toFixed(1)} pageDown=${before.toFixed(1)}->${after.toFixed(1)}`,
        );
      });
    }
  }
});

test.describe("year story teardown", () => {
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`leaves the lenis class or an inline style on html after the guide link (${locale} ${width})`, async ({
        page,
      }) => {
        const copy = catalogue(locale);
        const month = cairoMonth();
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto(`/${locale}`);
        await page.locator("[data-dial-label]").first().waitFor();
        await expect.poll(async () => page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(true);
        await page.getByRole("link", { name: copy.home.guideLink, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=${month}$`));
        await expect
          .poll(async () =>
            page.evaluate(() => {
              const root = document.documentElement;
              const lenis = [...root.classList].some((name) => name === "lenis" || name.startsWith("lenis-"));
              return !lenis && (root.getAttribute("style") ?? "") === "";
            }),
          )
          .toBe(true);
        console.log(`year-story ${locale} ${width} teardown lenis=false style=`);
      });
    }
  }
});

const SIZE_WIDTHS = [320, 390, 1280] as const;

function sizeFloor(width: number): { forward: number; disc: number } | null {
  if (width === 390) return { forward: 2.4, disc: 6 };
  if (width === 1280) return { forward: 4, disc: 10 };
  return null;
}

type StorySizes = {
  forward: number;
  disc: number;
  minLabelGap: number;
  minCircleGap: number;
  tickClear: number;
  forwardCount: number;
  labelCount: number;
  circleCount: number;
  scrollWidth: number;
  clientWidth: number;
};

async function storySizes(page: Page): Promise<StorySizes> {
  return page.evaluate(() => {
    const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const ring = document.querySelector("[data-dial-ring]");
    const line = ring?.querySelector("line");
    const img = document.querySelector("[data-hero-photo] img");
    if (!(ring instanceof SVGSVGElement) || !(line instanceof SVGLineElement) || !(img instanceof HTMLImageElement)) {
      throw new Error("the story dial, its tick, or the hero photograph is missing");
    }
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
    const innerDist = Math.hypot(inner.x - centre.x, inner.y - centre.y);
    const strokeUser = Number.parseFloat(getComputedStyle(line).strokeWidth);
    const halfScreen = (strokeUser / 2) * (ringRadius / 20);

    const imgBox = img.getBoundingClientRect();
    const imgRadius = Math.min(imgBox.width, imgBox.height) / 2;
    const imgOffset = Math.hypot(imgBox.x + imgBox.width / 2 - centre.x, imgBox.y + imgBox.height / 2 - centre.y);
    const tickClear = innerDist - halfScreen - imgOffset - imgRadius;

    let host: Element | null = ring;
    while (host && host.querySelector("[data-story-produce]") === null) host = host.parentElement;
    if (!(host instanceof HTMLElement)) throw new Error("the story object is missing");
    const objectBox = host.getBoundingClientRect();

    const textBoxes = [...document.querySelectorAll("[data-dial-label]")].flatMap((label) => {
      const text = label.firstElementChild?.firstChild;
      if (!(text instanceof Text)) return [];
      const range = document.createRange();
      range.selectNodeContents(text);
      const rect = range.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return [];
      return [rect];
    });

    const circles = [...document.querySelectorAll("[data-story-produce]")].flatMap((node) => {
      if (!(node instanceof HTMLElement)) return [];
      const rect = node.getBoundingClientRect();
      const opacity = Number.parseFloat(getComputedStyle(node).opacity);
      const transform = getComputedStyle(node).transform;
      let scale = 1;
      if (transform !== "none") {
        const match = /matrix\(([^)]+)\)/.exec(transform);
        if (match?.[1]) {
          const [a, b] = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
          scale = Math.hypot(a ?? 1, b ?? 0);
        }
      }
      return [
        {
          cx: rect.x + rect.width / 2,
          cy: rect.y + rect.height / 2,
          r: Math.min(rect.width, rect.height) / 2,
          width: rect.width,
          forward: opacity >= 0.99 && scale >= 0.99,
        },
      ];
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

    let minLabelGap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < textBoxes.length; i += 1) {
      const rect = textBoxes[i];
      if (!rect) continue;
      minLabelGap = Math.min(minLabelGap, gapRectToCircle(rect, centre.x, centre.y, ringRadius));
      minLabelGap = Math.min(
        minLabelGap,
        gapRectToCircle(rect, imgBox.x + imgBox.width / 2, imgBox.y + imgBox.height / 2, imgRadius),
      );
      for (const circle of circles) {
        minLabelGap = Math.min(minLabelGap, gapRectToCircle(rect, circle.cx, circle.cy, circle.r));
      }
      for (let j = i + 1; j < textBoxes.length; j += 1) {
        const other = textBoxes[j];
        if (!other) continue;
        minLabelGap = Math.min(minLabelGap, gapRects(rect, other));
      }
    }

    let minCircleGap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < circles.length; i += 1) {
      const circle = circles[i];
      if (!circle) continue;
      minCircleGap = Math.min(
        minCircleGap,
        circle.cx - circle.r - objectBox.left,
        objectBox.right - (circle.cx + circle.r),
        circle.cy - circle.r - objectBox.top,
        objectBox.bottom - (circle.cy + circle.r),
      );
      for (let j = i + 1; j < circles.length; j += 1) {
        const other = circles[j];
        if (!other) continue;
        minCircleGap = Math.min(
          minCircleGap,
          Math.hypot(circle.cx - other.cx, circle.cy - other.cy) - circle.r - other.r,
        );
      }
    }

    const forward = circles.filter((circle) => circle.forward);
    const forwardWidth = forward.reduce((min, circle) => Math.min(min, circle.width), Number.POSITIVE_INFINITY);
    return {
      forward: forwardWidth / root,
      disc: Math.min(imgBox.width, imgBox.height) / root,
      minLabelGap,
      minCircleGap,
      tickClear,
      forwardCount: forward.length,
      labelCount: textBoxes.length,
      circleCount: circles.length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

test.describe("year story orbit and centre", () => {
  for (const locale of LOCALES) {
    for (const width of SIZE_WIDTHS) {
      test(`draws a forward circle under the floor, overlaps the dial, or rests the tick on the photograph (${locale} ${width})`, async ({
        page,
      }) => {
        const height = width === 1280 ? 900 : width === 390 ? 844 : 700;
        await page.setViewportSize({ width, height });
        await page.goto(`/${locale}`);
        await page.locator("[data-dial-label]").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const href = await page.locator("main a[href*='guide?month=']").getAttribute("href");
        const initial = Number(new URL(href ?? "", "http://127.0.0.1").searchParams.get("month"));
        expect(initial).toBeGreaterThanOrEqual(1);
        expect(initial).toBeLessThanOrEqual(12);
        const { start, step } = await storyScroll(page);
        expect(step).toBeGreaterThan(100);
        const beforeSign = locale === "ar" ? -1 : 1;
        const dialStep = await page.evaluate(() =>
          Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dial-step")),
        );
        expect(dialStep).toBeGreaterThan(0);

        const assertSizes = async (storyStep: number, month: number, angle: number) => {
          await waitForAngle(page, month, angle);
          await expect
            .poll(async () => (await forwardSlugs(page)).sort().join(","))
            .toBe(setFor(month).sort().join(","));
          const sizes = await storySizes(page);
          console.log(
            `year-story ${locale} ${width} sizes step=${storyStep} forward=${sizes.forward.toFixed(2)} disc=${sizes.disc.toFixed(2)} minLabelGap=${sizes.minLabelGap.toFixed(2)} minCircleGap=${sizes.minCircleGap.toFixed(2)} tickClear=${sizes.tickClear.toFixed(2)}`,
          );
          expect(sizes.labelCount).toBe(12);
          expect(sizes.circleCount).toBe(10);
          expect(sizes.forwardCount).toBeGreaterThan(0);
          expect(sizes.forward).toBeGreaterThan(0);
          if (width === 320) {
            expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
            return;
          }
          const floor = sizeFloor(width);
          if (!floor) throw new Error(`no floor for ${width}`);
          const root = await page.evaluate(() =>
            Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
          );
          expect(sizes.forward).toBeGreaterThanOrEqual(floor.forward);
          expect(sizes.disc).toBeGreaterThanOrEqual(floor.disc);
          expect(sizes.minLabelGap / root).toBeGreaterThanOrEqual(0.1);
          expect(sizes.minCircleGap / root).toBeGreaterThanOrEqual(0.1);
          expect(sizes.tickClear).toBeGreaterThan(0);
        };

        await scrollToY(page, start);
        await assertSizes(0, initial, 0);

        const month = monthAfter(initial, 6);
        await scrollToY(page, start + 5 * step);
        await waitForAngle(page, month, beforeSign * dialStep);
        await scrollToY(page, start + 6 * step);
        await assertSizes(6, month, 0);
      });
    }
  }
});

test.describe("year story settled axe", () => {
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`reports an axe violation on the settled home page (${locale} ${width})`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.goto(`/${locale}`);
        await page.locator("[data-dial-label]").first().waitFor();
        // The in-season cells rise from opacity 0. Axe samples that blend as a contrast failure.
        await expect.poll(async () =>
          page.locator("[data-reveal-item]").evaluateAll((cells) =>
            cells.every((cell) => {
              const rising = cell.getAnimations().some((animation) => animation.playState === "running");
              return !rising && getComputedStyle(cell).opacity === "1";
            }),
          ),
        ).toBe(true);
        const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        console.log(`year-story ${locale} ${width} axe=${violations.violations.length}`);
        expect(violations.violations).toEqual([]);
      });
    }
  }
});
