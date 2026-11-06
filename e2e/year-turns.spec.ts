import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LOCALES = ["ar", "en"] as const;
const WIDTHS = [390, 1280] as const;

type LocaleCode = (typeof LOCALES)[number];

type ProduceRow = {
  slug: string;
  months: number[];
};

type CardHit = {
  slug: string;
  circular: boolean;
  inside: boolean;
  photoBeforeCopy: boolean;
};

const produce = JSON.parse(readFileSync("content/produce.json", "utf8")) as ProduceRow[];

function heightFor(width: number): number {
  return width === 390 ? 844 : 900;
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

function signedDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

function pagePaths(locale: LocaleCode): string[] {
  return [
    `/${locale}`,
    `/${locale}/guide?month=8`,
    `/${locale}/guide?month=8&view=chart`,
    ...produce.map((row) => `/${locale}/produce/${row.slug}`),
    `/${locale}/about`,
  ];
}

function staticFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...staticFiles(path));
    else found.push(path);
  }
  return found;
}

function bundleMarksThree(): boolean {
  const root = ".next/static";
  for (const file of staticFiles(root)) {
    if (!file.endsWith(".js") && !file.endsWith(".css")) continue;
    const text = readFileSync(file, "utf8");
    if (text.includes("THREE.") || text.includes("WebGLRenderer")) return true;
  }
  return false;
}

function rememberScript(raw: string, foreign: string[]): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    foreign.push(raw);
    return;
  }
  if (url.protocol === "data:" || url.protocol === "blob:") return;
  if (url.hostname !== "127.0.0.1") foreign.push(raw);
}

async function installShift(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const bucket: number[] = [];
    Object.assign(window, { __yearShifts: bucket });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (shift.hadRecentInput || typeof shift.value !== "number") continue;
        bucket.push(shift.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function clearShift(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bucket = (window as unknown as { __yearShifts?: number[] }).__yearShifts;
    if (bucket) bucket.length = 0;
  });
}

async function shiftSum(page: Page): Promise<number> {
  return page.evaluate(() => {
    const bucket = (window as unknown as { __yearShifts?: number[] }).__yearShifts ?? [];
    return bucket.reduce((sum, value) => sum + value, 0);
  });
}

async function scrollToY(page: Page, top: number): Promise<void> {
  await page.evaluate((target) => {
    window.scrollTo({ top: target, left: 0, behavior: "instant" });
  }, top);
  await expect
    .poll(async () => page.evaluate((target) => Math.abs(window.scrollY - target) < 2, top), { timeout: 8_000 })
    .toBe(true);
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

async function waitUntilDialSettles(page: Page): Promise<void> {
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

async function cardNamesOpaque(page: Page): Promise<boolean> {
  return page.locator("main a[href*='/produce/'] h2").evaluateAll((names) =>
    names.every((name) => {
      const cell = name.closest("li") ?? name;
      const pending = cell.getAttribute("data-reveal") === "pending";
      const opacity = getComputedStyle(cell).opacity;
      const rising = [cell, name].some((node) =>
        node.getAnimations().some((animation) => animation.playState === "running"),
      );
      if (rising) return false;
      if (pending) return opacity === "0" || opacity === "1";
      return opacity === "1";
    }),
  );
}

const CARD_MONTHS = [8, 1, 10] as const;

function slugsInMonth(month: number): string[] {
  return produce.filter((row) => row.months.includes(month)).map((row) => row.slug);
}

async function readCardHit(card: Locator): Promise<CardHit> {
  return card.evaluate((anchor) => {
    const slug = /\/produce\/([^/?#]+)/.exec(anchor.querySelector("a")?.getAttribute("href") ?? "")?.[1] ?? "";
    const ring = anchor.querySelector("[data-season-ring]");
    const circle = anchor.querySelector("[data-photo-circle]");
    const img = circle?.querySelector("img");
    if (!(ring instanceof HTMLElement) || !(circle instanceof HTMLElement) || !(img instanceof HTMLImageElement)) {
      return { slug, circular: false, inside: false, photoBeforeCopy: false };
    }
    const ringBox = ring.getBoundingClientRect();
    const circleBox = circle.getBoundingClientRect();
    const radius = Number.parseFloat(getComputedStyle(circle).borderTopLeftRadius);
    const side = Math.min(circleBox.width, circleBox.height);
    const circular = side > 1 && radius + 1 >= side / 2;
    const inside =
      circleBox.left >= ringBox.left - 1 &&
      circleBox.top >= ringBox.top - 1 &&
      circleBox.right <= ringBox.right + 1 &&
      circleBox.bottom <= ringBox.bottom + 1 &&
      circleBox.width < ringBox.width &&
      circleBox.height < ringBox.height;
    const stack = document.elementsFromPoint(
      circleBox.left + circleBox.width / 2,
      circleBox.top + circleBox.height / 2,
    );
    const photoAt = stack.findIndex((node) => node === img);
    const copyAt = stack.findIndex((node) => {
      if (!(node instanceof Element)) return false;
      if (node === img || img.contains(node)) return false;
      const badge = node.closest("[data-badge], [class*='badge']");
      const copy = node.closest("h2, p");
      return (badge !== null || copy !== null) && anchor.contains(node);
    });
    return { slug, circular, inside, photoBeforeCopy: photoAt >= 0 && (copyAt < 0 || photoAt < copyAt) };
  });
}

async function settleNames(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
  });
  await expect.poll(() => cardNamesOpaque(page), { timeout: 8_000 }).toBe(true);
}

async function openSized(page: Page, path: string, width: number): Promise<void> {
  await page.setViewportSize({ width, height: heightFor(width) });
  const response = await page.goto(path);
  expect(response?.ok()).toBe(true);
}

type NoJsPage = "home" | "guide" | "chart";

function cardsFromContent(kind: NoJsPage): number {
  if (kind === "home") return produce.filter((row) => row.months.includes(cairoMonth())).length;
  if (kind === "guide") return produce.filter((row) => row.months.includes(8)).length;
  return produce.length;
}

type GuideSurface = "guide" | "chart";

function guideSurfaceHref(locale: LocaleCode, surface: GuideSurface): string {
  if (surface === "chart") return `/${locale}/guide?month=8&view=chart`;
  return `/${locale}/guide?month=8`;
}

async function installFirstload(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.assign(window, { __yearFirstload: seen });
    document.addEventListener(
      "animationstart",
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const card = target.closest("li[data-flip-id], [data-year-chart] ol > li");
        if (!(card instanceof HTMLElement) || card !== target || card.hasAttribute("hidden")) return;
        const box = card.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1 || box.top >= window.innerHeight || box.bottom <= 0) return;
        const slug = card.getAttribute("data-flip-id") ?? card.querySelector("a")?.getAttribute("href") ?? "";
        if (slug.length === 0 || seen.includes(slug)) return;
        seen.push(slug);
      },
      true,
    );
  });
}

async function waitUntilStill(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
  });
  await expect
    .poll(
      async () =>
        page.evaluate(
          () =>
            (document.getAnimations?.() ?? []).filter((animation) => animation.playState === "running").length,
        ),
      { timeout: 8_000 },
    )
    .toBe(0);
}

async function headingClip(page: Page): Promise<{ clipped: number; rects: number }> {
  return page.locator("h1").evaluate((heading) => {
    if (!(heading instanceof HTMLElement)) return { clipped: 1, rects: 0 };
    const range = document.createRange();
    range.selectNodeContents(heading);
    const box = heading.getBoundingClientRect();
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
    let top = Number.POSITIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    let out = 0;
    for (const rect of rects) {
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
      out = Math.max(out, box.left - rect.left, rect.right - box.right, box.top - rect.top, rect.bottom - box.bottom);
    }
    const textHeight = rects.length === 0 ? 0 : bottom - top;
    const max = getComputedStyle(heading).maxBlockSize;
    const maxPx = Number.parseFloat(max);
    const maxOk = max === "none" || (Number.isFinite(maxPx) && maxPx + 1 >= textHeight);
    const inside = rects.length > 0 && out <= 1;
    return { clipped: inside && maxOk ? 0 : 1, rects: rects.length };
  });
}

async function firstloadCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const seen = (window as unknown as { __yearFirstload?: string[] }).__yearFirstload;
    return seen?.length ?? -1;
  });
}

async function viewportCards(page: Page): Promise<{ count: number; names: string[] }> {
  return page.evaluate(() => {
    const names: string[] = [];
    const cards = [...document.querySelectorAll("li[data-flip-id]:not([hidden]), [data-year-chart] ol > li")];
    for (const card of cards) {
      if (!(card instanceof HTMLElement)) continue;
      const box = card.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1 || box.top >= window.innerHeight || box.bottom <= 0) continue;
      names.push(getComputedStyle(card).animationName);
    }
    return { count: names.length, names };
  });
}

async function paintedCount(page: Page, kind: NoJsPage): Promise<number> {
  return page.evaluate((which) => {
    const painted = (node: Element): boolean => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.closest("div[hidden][id^='S:']") !== null) return false;
      const box = node.getBoundingClientRect();
      const opacity = Number.parseFloat(getComputedStyle(node).opacity);
      return box.width > 1 && box.height > 1 && opacity >= 0.99;
    };
    if (which === "home") return [...document.querySelectorAll("[data-story-produce]")].filter(painted).length;
    if (which === "guide") return [...document.querySelectorAll("li[data-flip-id]:not([hidden])")].filter(painted).length;
    return [...document.querySelectorAll("[data-year-chart] ol > li")].filter(painted).length;
  }, kind);
}

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    test(`turns the dial the wrong way or lets it drift after the scroll stops (${locale} ${width})`, async ({
      page,
    }) => {
      await installShift(page);
      await openSized(page, `/${locale}`, width);
      await page.locator("[data-dial-label]").first().waitFor();
      const href = await page.locator("main a[href*='guide?month=']").getAttribute("href");
      const initial = Number(new URL(href ?? "", "http://127.0.0.1").searchParams.get("month"));
      expect(initial).toBeGreaterThanOrEqual(1);
      expect(initial).toBeLessThanOrEqual(12);

      const { start, step } = await storyScroll(page);
      expect(step).toBeGreaterThan(100);
      const month = monthAfter(initial, 6);
      await scrollToY(page, start + 5 * step);
      await waitUntilDialSettles(page);
      const approach = await labelAngle(page, month);
      const sign = approach > 8 ? 1 : approach < -8 ? -1 : 0;
      const rotationBefore = await dialRotation(page);
      expect(sign).toBe(locale === "ar" ? -1 : 1);

      await scrollToY(page, start + 6 * step);
      await expect.poll(async () => Math.abs(await labelAngle(page, month)), { timeout: 8_000 }).toBeLessThanOrEqual(2);
      await waitUntilDialSettles(page);
      const turned = signedDelta(rotationBefore, await dialRotation(page));
      expect(Math.sign(turned)).toBe(locale === "ar" ? 1 : -1);

      await scrollToY(page, start + 11 * step);
      await expect
        .poll(async () => Math.abs(await labelAngle(page, monthAfter(initial, 11))), { timeout: 8_000 })
        .toBeLessThanOrEqual(2);
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
      const shift = await shiftSum(page);
      console.log(
        `year-turns ${locale} ${width} sign=${sign} frames=${frames.length} shift=${shift} turn=${turned.toFixed(2)}`,
      );
      expect(frames.length).toBe(30);
      expect(shift).toBe(0);
    });
  }
}

test.describe("year turns under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`moves off this month when motion is reduced (${locale} ${width})`, async ({ page }) => {
        const month = cairoMonth();
        await openSized(page, `/${locale}`, width);
        await page.locator("[data-dial-label]").first().waitFor();
        await expect(page.locator("main a[href*='guide?month=']")).toHaveAttribute(
          "href",
          `/${locale}/guide?month=${month}`,
        );
        await expect.poll(async () => Math.abs(await labelAngle(page, month)), { timeout: 8_000 }).toBeLessThanOrEqual(2);
        const lenis = await page.evaluate(() =>
          [...document.documentElement.classList].some((name) => name === "lenis" || name.startsWith("lenis-")),
        );
        const bottom = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        );
        await scrollToY(page, bottom);
        await expect(page.locator("main a[href*='guide?month=']")).toHaveAttribute(
          "href",
          `/${locale}/guide?month=${month}`,
        );
        const angle = await labelAngle(page, month);
        console.log(
          `year-turns ${locale} ${width} reduced month=${month} angle=${angle.toFixed(2)} lenis=${lenis}`,
        );
        expect(lenis).toBe(false);
        expect(Math.abs(angle)).toBeLessThanOrEqual(2);
      });
    }
  }
});

test.describe("year turns without javascript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`leaves this month when JavaScript is off (${locale} ${width})`, async ({ page }) => {
        const month = cairoMonth();
        await openSized(page, `/${locale}`, width);
        await expect.poll(async () => page.locator("[data-dial-label]").count()).toBe(12);
        await expect(page.locator("main a[href*='guide?month=']")).toHaveAttribute(
          "href",
          `/${locale}/guide?month=${month}`,
        );
        await expect(page.locator("[data-story-slot='month']:not([aria-hidden='true'])")).toHaveAttribute(
          "data-story-month",
          String(month),
        );
        const band = page.locator("[data-texture-band='hero']");
        await expect(band).toHaveCount(1);
        await expect(band.locator("> :not([aria-hidden='true'])").first()).toBeAttached();
        const settled = await page.evaluate(() => {
          const band = document.querySelector("[data-texture-band='hero']");
          const stage =
            band instanceof HTMLElement
              ? [...band.children].find((node) => node instanceof HTMLElement && node.getAttribute("aria-hidden") !== "true")
              : null;
          if (!(band instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
            return { hiddenSlot: false, height: "", band: -1, stage: -1, lenis: false };
          }
          return {
            hiddenSlot: band.closest("div[hidden][id^='S:']") !== null,
            height: getComputedStyle(band).height,
            band: band.getBoundingClientRect().height,
            stage: stage.getBoundingClientRect().height,
            lenis: [...document.documentElement.classList].some((name) => name === "lenis" || name.startsWith("lenis-")),
          };
        });
        console.log(
          `year-turns ${locale} ${width} nojs month=${month} hiddenSlot=${settled.hiddenSlot} height=${settled.height} lenis=${settled.lenis}`,
        );
        expect(settled.band).toBeGreaterThan(0);
        expect(settled.stage).toBeGreaterThan(0);
        expect(settled.hiddenSlot).toBe(false);
        expect(settled.lenis).toBe(false);
        expect(Math.abs(settled.band - settled.stage)).toBeLessThanOrEqual(0.5);
      });
    }
  }
});

test.describe("year turns pages arrive whole without javascript", () => {
  test.use({ javaScriptEnabled: false });

  const pages: { kind: NoJsPage; href: (locale: LocaleCode) => string }[] = [
    { kind: "home", href: (locale) => `/${locale}` },
    { kind: "guide", href: (locale) => `/${locale}/guide?month=8` },
    { kind: "chart", href: (locale) => `/${locale}/guide?month=8&view=chart` },
  ];

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      for (const target of pages) {
        test(`hides the ${target.kind} page, sets a cookie, or paints the wrong count without JavaScript (${locale} ${width})`, async ({
          page,
        }) => {
          const expected = cardsFromContent(target.kind);
          if (target.kind === "guide") expect(expected).toBe(7);
          if (target.kind === "chart") expect(expected).toBe(10);
          await page.setViewportSize({ width, height: heightFor(width) });
          const response = await page.goto(target.href(locale));
          const status = response?.status() ?? 0;
          const cookies = response?.headers()["set-cookie"] ? 1 : 0;
          const main = page.locator("main");
          await expect(main).toBeVisible();
          const hiddenSlot = await main.evaluate((node) => node.closest("div[hidden][id^='S:']") !== null);
          await expect
            .poll(async () => paintedCount(page, target.kind), { timeout: 5_000 })
            .toBe(expected);
          const cards = await paintedCount(page, target.kind);
          console.log(
            `year-turns ${locale} ${width} nojs page=${target.kind} hiddenSlot=${hiddenSlot} cookie=${cookies} cards=${cards}`,
          );
          expect(status).toBe(200);
          expect(cookies).toBe(0);
          expect(hiddenSlot).toBe(false);
          expect(cards).toBe(expected);
        });
      }
    }
  }
});

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    test(`picks the wrong month, shifts the cards, or draws a chart that is not ten by twelve (${locale} ${width})`, async ({
      page,
    }) => {
      await installShift(page);
      await openSized(page, `/${locale}/guide?month=8`, width);
      await expect(page.locator('a[data-month="8"][aria-current="true"]')).toBeVisible();
      await clearShift(page);
      await page.locator('a[data-month="9"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=9$`));
      await expect(page.locator('a[data-month="9"][aria-current="true"]')).toBeVisible();
      await settleNames(page);
      const shift = await shiftSum(page);

      await openSized(page, `/${locale}/guide?month=8&view=chart`, width);
      const chart = await page.locator("[data-year-chart]").evaluate((root) => {
        const rows = [...root.querySelectorAll("ol > li")];
        const selected = [
          ...new Set(
            [...root.querySelectorAll("[data-selected='true']")].map((node) => node.getAttribute("data-month")),
          ),
        ];
        return {
          rows: rows.length,
          cells: rows.map((row) => row.querySelectorAll("[data-month]").length),
          selectedInRows: rows.map((row) => row.querySelectorAll("[data-selected='true']").length),
          selected,
        };
      });
      console.log(
        `year-turns ${locale} ${width} guide month=9 shift=${shift} chart=${chart.rows}x${chart.cells[0] ?? 0} selected=${chart.selected.join(",")}`,
      );
      expect(shift).toBe(0);
      expect(chart.rows).toBe(10);
      expect(chart.cells).toEqual([12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);
      expect(chart.selectedInRows).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
      expect(chart.selected).toEqual(["8"]);
    });

    test(`covers a guide photograph or leaves a slug untested (${locale} ${width})`, async ({ page }) => {
      test.setTimeout(180_000);
      const checked = new Set<string>();
      let covered = 0;
      for (const month of CARD_MONTHS) {
        const expected = slugsInMonth(month);
        await openSized(page, `/${locale}/guide?month=${month}`, width);
        await settleNames(page);
        const cards = page.locator("li[data-flip-id]:not([hidden])");
        await expect(cards, `month ${month}`).toHaveCount(expected.length);
        const seen: string[] = [];
        for (let index = 0; index < expected.length; index += 1) {
          const card = cards.nth(index);
          await expect(card.locator("[data-photo-circle] img")).toHaveCount(1);
          await expect(card.locator("[data-season-ring]")).toHaveCount(1);
          await card.evaluate((node) => {
            node.scrollIntoView({ block: "center", inline: "center" });
            const circle = node.querySelector("[data-photo-circle]");
            const header = document.querySelector("header");
            if (!(circle instanceof HTMLElement) || !(header instanceof HTMLElement)) return;
            const overlap = header.getBoundingClientRect().bottom - circle.getBoundingClientRect().top;
            if (overlap > 0) window.scrollBy(0, -overlap);
          });
          await expect
            .poll(() =>
              card.evaluate((node) => {
                const opacity = Number(getComputedStyle(node).opacity);
                const box = node.getBoundingClientRect();
                return opacity >= 0.99 && box.width > 1 && box.height > 1;
              }),
            )
            .toBe(true);
          const hit = await readCardHit(card);
          expect(hit.circular, `${month} ${hit.slug}`).toBe(true);
          expect(hit.inside, `${month} ${hit.slug}`).toBe(true);
          expect(expected, hit.slug).toContain(hit.slug);
          if (!hit.photoBeforeCopy) covered += 1;
          seen.push(hit.slug);
          checked.add(hit.slug);
        }
        expect(new Set(seen).size, `month ${month}`).toBe(expected.length);
      }
      console.log(`year-turns ${locale} ${width} checked=${checked.size} covered=${covered}`);
      expect([...checked].sort()).toEqual(produce.map((row) => row.slug).sort());
      expect(checked.size).toBe(produce.length);
      expect(covered).toBe(0);
    });

    test(`draws an arc whose lit cells disagree with the content file (${locale} ${width})`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: heightFor(width) });
      for (const row of produce) {
        const response = await page.goto(`/${locale}/produce/${row.slug}`);
        expect(response?.ok()).toBe(true);
        await expect.poll(async () => page.locator("[data-arc-label]").count()).toBe(12);
        const arc = await page.evaluate(() => ({
          labels: document.querySelectorAll("[data-arc-label]").length,
          ticks: document.querySelectorAll("[data-arc-tick]").length,
          lit: document.querySelectorAll("[data-in='true']").length,
        }));
        console.log(
          `year-turns ${locale} ${width} arc=${row.slug} labels=${arc.labels} tick=${arc.ticks} lit=${arc.lit} months=${row.months.length}`,
        );
        expect(arc.labels).toBe(12);
        expect(arc.ticks).toBe(1);
        expect(arc.lit).toBe(row.months.length);
      }
    });

    test(`ships THREE or WebGLRenderer, or requests a script from another origin (${locale} ${width})`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const foreign: string[] = [];
      page.on("request", (request) => {
        if (request.resourceType() === "script") rememberScript(request.url(), foreign);
      });
      await page.setViewportSize({ width, height: heightFor(width) });
      for (const path of pagePaths(locale)) {
        const response = await page.goto(path);
        expect(response?.ok(), path).toBe(true);
        await expect(page.locator("h1")).toBeVisible();
      }
      const three = bundleMarksThree();
      console.log(`year-turns ${locale} ${width} bundle three=${three} scripts=${foreign.length}`);
      expect(three).toBe(false);
      expect(foreign).toEqual([]);
    });

    test(`reports an axe violation on a settled page (${locale} ${width})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width, height: heightFor(width) });
      for (const path of pagePaths(locale)) {
        const response = await page.goto(path);
        expect(response?.ok(), path).toBe(true);
        await expect(page.locator("h1")).toBeVisible();
        await settleNames(page);
        await expect
          .poll(() =>
            page.evaluate(
              () => (document.getAnimations?.() ?? []).filter((animation) => animation.playState === "running").length,
            ),
          )
          .toBe(0);
        const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        console.log(`year-turns ${locale} ${width} axe=${violations.violations.length} path=${path}`);
        expect(violations.violations).toEqual([]);
      }
    });
  }
}

const SURFACES: GuideSurface[] = ["guide", "chart"];

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    for (const surface of SURFACES) {
      test(`clips the ${surface} heading (${locale} ${width})`, async ({ page }) => {
        await installShift(page);
        await openSized(page, guideSurfaceHref(locale, surface), width);
        await expect(page.locator("h1")).toBeVisible();
        await page.evaluate(async () => {
          if (document.fonts) await document.fonts.ready;
        });
        const reading = await headingClip(page);
        const shift = await shiftSum(page);
        console.log(
          `year-turns ${locale} ${width} heading clipped=${reading.clipped} page=${surface} shift=${shift}`,
        );
        expect(reading.rects).toBeGreaterThan(0);
        expect(reading.clipped).toBe(0);
        expect(shift).toBe(0);
      });

      test(`plays rise on a first-viewport card when the ${surface} page loads (${locale} ${width})`, async ({
        page,
      }) => {
        await installFirstload(page);
        await openSized(page, guideSurfaceHref(locale, surface), width);
        await expect(page.locator("h1")).toBeVisible();
        const anchor =
          surface === "guide"
            ? page.locator("li[data-flip-id]:not([hidden])").first()
            : page.locator("[data-year-chart] ol > li").first();
        await expect(anchor).toBeVisible();
        await waitUntilStill(page);
        const animated = await firstloadCount(page);
        const viewport = await viewportCards(page);
        console.log(
          `year-turns ${locale} ${width} firstload animated=${animated} page=${surface} viewport=${viewport.count}`,
        );
        expect(animated).toBe(0);
      });
    }
  }
}

test.describe("year turns first load without javascript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      for (const surface of SURFACES) {
        test(`gives a first-viewport card an animation when JavaScript is off on ${surface} (${locale} ${width})`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: heightFor(width) });
          const response = await page.goto(guideSurfaceHref(locale, surface));
          expect(response?.status()).toBe(200);
          const anchor =
            surface === "guide"
              ? page.locator("li[data-flip-id]:not([hidden])").first()
              : page.locator("[data-year-chart] ol > li").first();
          await expect(anchor).toBeAttached();
          const viewport = await viewportCards(page);
          const moving = viewport.names.filter((name) => name !== "none");
          console.log(
            `year-turns ${locale} ${width} firstload nojs page=${surface} seen=${viewport.count} names=${viewport.names.join(",") || "none"}`,
          );
          expect(moving).toEqual([]);
        });
      }
    }
  }
});
