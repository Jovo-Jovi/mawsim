import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

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
    const object = document.querySelector("[data-dial-turn]");
    const link = document.querySelector("main a[href*='guide?month=']");
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
