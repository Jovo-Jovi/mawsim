import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const VIEWPORTS = [
  { name: "1280", width: 1280, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

const SEPTEMBER = ["tomato", "mango", "guava", "pomegranate", "okra", "molokhia", "dates"] as const;

type CatalogueRow = { slug: string; months: number[] };

type LabelBox = {
  month: string;
  x: number;
  y: number;
  w: number;
  h: number;
  transform: string;
  inline: string;
};

type CardBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  hidden: boolean;
  transform: string;
  inline: string;
};

type WrapBox = { transform: string; inline: string; opacity: number };

type Frame = {
  t: number;
  cx: number;
  cy: number;
  labels: LabelBox[];
  cards: CardBox[];
  wraps: WrapBox[];
  turnTransform: string;
  turnInline: string;
};

type ShiftRow = {
  value: number;
  hadRecentInput: boolean;
  startTime: number;
  sources: string[];
};

type Point = { x: number; y: number; w: number; h: number };

function slugsInMonth(month: number): string[] {
  const rows = JSON.parse(readFileSync("content/produce.json", "utf8")) as CatalogueRow[];
  return rows.filter((row) => row.months.includes(month)).map((row) => row.slug);
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

function watchRequests(page: Page, foreign: string[]): void {
  page.on("request", (request) => rememberForeign(request.url(), foreign));
  page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));
}

function angleOf(frame: Frame, month: string): number {
  const label = frame.labels.find((box) => box.month === month);
  if (!label) return Number.NaN;
  const dx = label.x + label.w / 2 - frame.cx;
  const dy = label.y + label.h / 2 - frame.cy;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

function identityTransform(transform: string): boolean {
  if (transform === "none") return true;
  const matrix = /^(?:matrix|matrix3d)\(([^)]+)\)$/.exec(transform);
  const body = matrix?.[1];
  if (!body) return false;
  const parts = body.split(",").map((part) => Number(part.trim()));
  if (parts.length === 6) {
    const [a, b, c, d, tx, ty] = parts;
    if (a === undefined || b === undefined || c === undefined || d === undefined || tx === undefined || ty === undefined) {
      return false;
    }
    return Math.abs(a - 1) < 0.02 && Math.abs(b) < 0.02 && Math.abs(c) < 0.02 && Math.abs(d - 1) < 0.02 && Math.abs(tx) < 0.6 && Math.abs(ty) < 0.6;
  }
  return false;
}

function uniformScale(transform: string): number | null {
  if (transform === "none") return 1;
  const matched = /^matrix\(([^)]+)\)$/.exec(transform);
  const body = matched?.[1];
  if (!body) return null;
  const parts = body.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 6) return null;
  const [a, b, c, d] = parts;
  if (a === undefined || b === undefined || c === undefined || d === undefined) return null;
  if (Math.abs(b) > 0.02 || Math.abs(c) > 0.02 || Math.abs(a - d) > 0.02 || a <= 0) return null;
  return a;
}

/** The selected link grows from --pill-grow-from, so its painted box is briefly under 44.
 * Dividing that uniform scale out leaves the upright box. A tilt is not a uniform scale. */
function labelOffSquare(label: LabelBox): boolean {
  const scale = uniformScale(label.transform);
  if (scale === null) return true;
  return Math.abs(label.w / scale - 44) > 1 || Math.abs(label.h / scale - 44) > 1 || label.w > 50 || label.h > 50;
}

function movesTowardZero(angles: number[], sign: 1 | -1): boolean {
  for (let index = 1; index < angles.length; index += 1) {
    const previous = angles[index - 1];
    const next = angles[index];
    if (previous === undefined || next === undefined) return false;
    if (sign === 1 && next > previous + 2) return false;
    if (sign === -1 && next < previous - 2) return false;
  }
  return true;
}

function translateY(transform: string): number {
  const matched = /matrix\(\s*([^)]+)\)/.exec(transform);
  if (!matched?.[1]) return 0;
  const parts = matched[1].split(",").map((part) => Number(part.trim()));
  return Math.abs(parts[5] ?? 0);
}

function strictlyBetween(sample: number, from: number, to: number): boolean {
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  return high - low > 4 && sample > low + 1 && sample < high - 1;
}

function betweenPlaces(sample: Point, from: Point, to: Point): boolean {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  if (dx < 8 && dy < 8) return false;
  if (dx >= dy) return strictlyBetween(sample.x, from.x, to.x);
  return strictlyBetween(sample.y, from.y, to.y);
}

async function labelAngle(page: Page, month: string): Promise<number> {
  return page.evaluate((selected) => {
    const ring = document.querySelector("[data-dial-ring]");
    const link = document.querySelector(`a[data-month="${selected}"]`);
    if (!(ring instanceof Element) || !(link instanceof Element)) return Number.NaN;
    const ringBox = ring.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const dx = linkBox.x + linkBox.width / 2 - (ringBox.x + ringBox.width / 2);
    const dy = linkBox.y + linkBox.height / 2 - (ringBox.y + ringBox.height / 2);
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }, month);
}

async function beginRecording(page: Page): Promise<void> {
  await page.evaluate(() => {
    type LiveLabel = {
      month: string;
      x: number;
      y: number;
      w: number;
      h: number;
      transform: string;
      inline: string;
    };
    type LiveCard = {
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      opacity: number;
      hidden: boolean;
      transform: string;
      inline: string;
    };
    type LiveWrap = { transform: string; inline: string; opacity: number };
    type LiveFrame = {
      t: number;
      cx: number;
      cy: number;
      labels: LiveLabel[];
      cards: LiveCard[];
      wraps: LiveWrap[];
      turnTransform: string;
      turnInline: string;
    };
    type LiveShift = { value: number; hadRecentInput: boolean; startTime: number; sources: string[] };
    const holder = window as Window & {
      __frames?: LiveFrame[];
      __stopFrames?: () => void;
      __shifts?: LiveShift[];
      __mark?: number;
    };
    const frames: LiveFrame[] = [];
    holder.__frames = frames;
    let live = true;
    const tick = () => {
      if (!live) return;
      const ring = document.querySelector("[data-dial-ring]");
      const turn = document.querySelector("[data-dial-turn]");
      if (ring instanceof Element) {
        const ringBox = ring.getBoundingClientRect();
        const turnStyle = turn instanceof Element ? getComputedStyle(turn) : null;
        frames.push({
          t: performance.now(),
          cx: ringBox.x + ringBox.width / 2,
          cy: ringBox.y + ringBox.height / 2,
          labels: [...document.querySelectorAll("a[data-month]")].map((element) => {
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              month: element.getAttribute("data-month") ?? "",
              x: box.x,
              y: box.y,
              w: box.width,
              h: box.height,
              transform: style.transform,
              inline: element.getAttribute("style") ?? "",
            };
          }),
          cards: [...document.querySelectorAll("li[data-flip-id]")].map((element) => {
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              id: element.getAttribute("data-flip-id") ?? "",
              x: box.x,
              y: box.y,
              w: box.width,
              h: box.height,
              opacity: Number(style.opacity),
              hidden: element.hasAttribute("hidden"),
              transform: style.transform,
              inline: element.getAttribute("style") ?? "",
            };
          }),
          wraps: [...document.querySelectorAll("[data-dial-label]")].map((element) => {
            const style = getComputedStyle(element);
            return {
              transform: style.transform,
              inline: element.getAttribute("style") ?? "",
              opacity: Number(style.opacity),
            };
          }),
          turnTransform: turnStyle?.transform ?? "none",
          turnInline: turn?.getAttribute("style") ?? "",
        });
        if (frames.length > 900) frames.shift();
      }
      requestAnimationFrame(tick);
    };
    holder.__stopFrames = () => {
      live = false;
    };
    requestAnimationFrame(tick);
    const shifts: LiveShift[] = [];
    holder.__shifts = shifts;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
          sources?: Array<{ node?: Node | null }>;
        };
        shifts.push({
          value: shift.value ?? 0,
          hadRecentInput: Boolean(shift.hadRecentInput),
          startTime: entry.startTime,
          sources: (shift.sources ?? []).map((source) => {
            const node = source.node;
            if (!(node instanceof Element)) return "detached";
            const flip = node.getAttribute("data-flip-id");
            const month = node.getAttribute("data-month");
            return `${node.tagName}${flip ? `:${flip}` : ""}${month ? `:m${month}` : ""}`;
          }),
        });
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
  });
}

async function stopRecording(page: Page): Promise<{ frames: Frame[]; shifts: ShiftRow[]; mark: number }> {
  return page.evaluate(() => {
    const holder = window as Window & {
      __frames?: Frame[];
      __stopFrames?: () => void;
      __shifts?: ShiftRow[];
      __mark?: number;
    };
    holder.__stopFrames?.();
    return { frames: holder.__frames ?? [], shifts: holder.__shifts ?? [], mark: holder.__mark ?? 0 };
  });
}

async function markClick(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as Window & { __mark?: number }).__mark = performance.now();
  });
}

async function cardRects(page: Page): Promise<Record<string, Point>> {
  return page.evaluate(() => {
    const rects: Record<string, { x: number; y: number; w: number; h: number }> = {};
    for (const element of document.querySelectorAll("li[data-flip-id]:not([hidden])")) {
      const box = element.getBoundingClientRect();
      rects[element.getAttribute("data-flip-id") ?? ""] = { x: box.x, y: box.y, w: box.width, h: box.height };
    }
    return rects;
  });
}

async function waitStable(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const read = () =>
          [...document.querySelectorAll("li[data-flip-id]:not([hidden])")]
            .map((element) => {
              const box = element.getBoundingClientRect();
              return `${element.getAttribute("data-flip-id")}:${box.x.toFixed(1)}:${box.y.toFixed(1)}:${box.width.toFixed(1)}:${box.height.toFixed(1)}`;
            })
            .join("|");
        const first = read();
        return new Promise<boolean>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve(read() === first && first.length > 0));
          });
        });
      }),
    )
    .toBe(true);
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

for (const locale of ["en", "ar"] as const) {
  for (const viewport of VIEWPORTS) {
    test(`spins the long way, tilts a label, jumps a card, or shifts layout when August becomes September at ${locale} ${viewport.name}`, async ({
      page,
    }) => {
      const foreign: string[] = [];
      watchRequests(page, foreign);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`/${locale}/guide?month=8`);
      expect(response?.ok()).toBe(true);
      await expect(page.locator('a[data-month][aria-current="true"]')).toHaveAttribute("data-month", "8");
      await expect.poll(async () => Math.abs(await labelAngle(page, "8"))).toBeLessThanOrEqual(2);

      const leave = slugsInMonth(8).filter((slug) => !slugsInMonth(9).includes(slug));
      const enter = slugsInMonth(9).filter((slug) => !slugsInMonth(8).includes(slug));
      expect(leave).toEqual(["watermelon"]);
      expect(enter).toEqual(["pomegranate"]);
      const before = await cardRects(page);
      await beginRecording(page);
      await markClick(page);
      await page.locator('a[data-month="9"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=9$`));
      await expect.poll(async () => Math.abs(await labelAngle(page, "9"))).toBeLessThanOrEqual(2);
      await waitStable(page);
      const after = await cardRects(page);
      const recorded = await stopRecording(page);
      const frames = recorded.frames.filter((frame) => frame.t >= recorded.mark);
      const sign: 1 | -1 = locale === "en" ? 1 : -1;
      const angles = frames.map((frame) => angleOf(frame, "9"));
      expect(angles.some((angle) => Number.isNaN(angle))).toBe(false);
      const first = angles[0] ?? Number.NaN;
      const last = angles[angles.length - 1] ?? Number.NaN;
      const sizes = frames.flatMap((frame) => frame.labels.map((label) => `${label.month}:${label.w.toFixed(2)}x${label.h.toFixed(2)}`));
      console.log(
        `${locale} ${viewport.name} turn first=${first.toFixed(2)} last=${last.toFixed(2)} samples=${angles.length} sign=${sign}`,
      );
      console.log(`${locale} ${viewport.name} label-sizes ${[...new Set(sizes)].slice(0, 24).join(" ")}`);

      expect(Math.abs(first)).toBeGreaterThan(18);
      expect(Math.abs(first)).toBeLessThan(42);
      expect(Math.sign(first)).toBe(sign);
      expect(Math.abs(last)).toBeLessThanOrEqual(2);
      expect(movesTowardZero(angles, sign)).toBe(true);

      const offSquare = frames.flatMap((frame) =>
        frame.labels
          .filter((label) => labelOffSquare(label))
          .map((label) => `${label.month}:${label.w.toFixed(2)}x${label.h.toFixed(2)}:${label.transform}`),
      );
      expect(offSquare).toEqual([]);

      const staying = slugsInMonth(8).filter((slug) => slugsInMonth(9).includes(slug));
      const mover = staying
        .map((slug) => {
          const from = before[slug];
          const to = after[slug];
          if (!from || !to) return { slug, distance: -1 };
          return { slug, distance: Math.hypot(from.x - to.x, from.y - to.y) };
        })
        .sort((left, right) => right.distance - left.distance)[0];
      if (!mover || mover.distance < 8) throw new Error(`no staying card changed place (${mover?.slug ?? "none"} ${mover?.distance ?? 0})`);
      const from = before[mover.slug];
      const to = after[mover.slug];
      if (!from || !to) throw new Error("mover rect missing");
      const started = frames
        .map((frame) => frame.cards.find((item) => item.id === mover.slug))
        .find((card) => card && card.w > 1);
      const origin = started ?? from;
      const path = frames.flatMap((frame) => {
        const card = frame.cards.find((item) => item.id === mover.slug);
        return card ? [`${card.x.toFixed(0)},${card.y.toFixed(0)}`] : [];
      });
      const mid = frames.some((frame) => {
        const card = frame.cards.find((item) => item.id === mover.slug);
        return card && card !== started ? betweenPlaces(card, origin, to) : false;
      });
      console.log(
        `${locale} ${viewport.name} mover=${mover.slug} from=${from.x.toFixed(1)},${from.y.toFixed(1)} to=${to.x.toFixed(1)},${to.y.toFixed(1)} between=${mid} path=${[...new Set(path)].slice(0, 6).join(" | ")}`,
      );
      expect(mid).toBe(true);

      const leaveId = leave[0] ?? "";
      const faded = frames.some((frame) => {
        const card = frame.cards.find((item) => item.id === leaveId);
        return card ? card.w > 1 && card.h > 1 && card.opacity > 0.02 && card.opacity < 0.98 : false;
      });
      const leaveEnd = recorded.frames[recorded.frames.length - 1]?.cards.find((card) => card.id === leaveId);
      console.log(`${locale} ${viewport.name} leave=${leaveId} faded=${faded} hidden=${leaveEnd?.hidden ?? false} box=${leaveEnd?.w ?? -1}`);
      expect(faded).toBe(true);
      expect(leaveEnd?.hidden).toBe(true);
      expect(leaveEnd?.w ?? 1).toBeLessThan(1);

      const enterId = enter[0] ?? "";
      const entered = after[enterId];
      if (!entered) throw new Error("entering card missing at the end");
      const rose = frames.some((frame) => {
        const card = frame.cards.find((item) => item.id === enterId);
        if (!card || card.w <= 1 || card.h <= 1) return false;
        return card.y > entered.y + 8 || translateY(card.transform) > 8;
      });
      console.log(`${locale} ${viewport.name} enter=${enterId} rose=${rose} endY=${entered.y.toFixed(1)}`);
      expect(rose).toBe(true);

      const fresh = await page.context().newPage();
      await fresh.setViewportSize({ width: viewport.width, height: viewport.height });
      const freshResponse = await fresh.goto(`/${locale}/guide?month=9`);
      expect(freshResponse?.ok()).toBe(true);
      await expect
        .poll(async () => {
          const rects = await cardRects(fresh);
          return Object.values(rects).some((rect) => rect.w > 10);
        })
        .toBe(true);
      await fresh.evaluate(() => document.fonts.ready.then(() => window.scrollTo(0, 0)));
      await waitStable(fresh);
      const freshRects = await cardRects(fresh);
      await fresh.close();
      await page.evaluate(() => document.fonts.ready.then(() => window.scrollTo(0, 0)));
      await waitStable(page);
      const settled = await cardRects(page);
      const compared = Object.keys(settled).sort();
      expect(compared).toEqual(Object.keys(freshRects).sort());
      const drifted = compared.filter((slug) => {
        const left = settled[slug];
        const right = freshRects[slug];
        if (!left || !right) return true;
        return Math.abs(left.x - right.x) > 1 || Math.abs(left.y - right.y) > 1 || Math.abs(left.w - right.w) > 1 || Math.abs(left.h - right.h) > 1;
      });
      const sample = drifted[0];
      const sampleNote = sample
        ? ` ${sample} settled=${JSON.stringify(settled[sample])} fresh=${JSON.stringify(freshRects[sample])}`
        : "";
      console.log(`${locale} ${viewport.name} fresh-drift=${drifted.join(",") || "none"}${sampleNote}`);
      expect(drifted).toEqual([]);

      const during = recorded.shifts.filter((shift) => shift.startTime >= recorded.mark);
      const quiet = round4(during.filter((shift) => !shift.hadRecentInput).reduce((sum, shift) => sum + shift.value, 0));
      const all = round4(during.reduce((sum, shift) => sum + shift.value, 0));
      console.log(
        `${locale} ${viewport.name} shift quiet=${quiet} all=${all} ${during.map((shift) => `${shift.value.toFixed(4)} input=${shift.hadRecentInput} ${shift.sources.join("+") || "none"}`).join(" | ") || "no-entries"}`,
      );
      expect(quiet).toBe(0);
      expect(foreign).toEqual([]);
      console.log(`${locale} ${viewport.name} origins foreign=0`);
    });

    test(`swings more than one step from December to January at ${locale} ${viewport.name}`, async ({ page }) => {
      const foreign: string[] = [];
      watchRequests(page, foreign);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`/${locale}/guide?month=12`);
      expect(response?.ok()).toBe(true);
      await expect(page.locator('a[data-month][aria-current="true"]')).toHaveAttribute("data-month", "12");
      await expect.poll(async () => Math.abs(await labelAngle(page, "12"))).toBeLessThanOrEqual(2);
      await beginRecording(page);
      await markClick(page);
      await page.locator('a[data-month-step="next"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=1$`));
      await expect.poll(async () => Math.abs(await labelAngle(page, "1"))).toBeLessThanOrEqual(2);
      const recorded = await stopRecording(page);
      const frames = recorded.frames.filter((frame) => frame.t >= recorded.mark);
      const sign: 1 | -1 = locale === "en" ? 1 : -1;
      const angles = frames.map((frame) => angleOf(frame, "1"));
      const first = angles[0] ?? Number.NaN;
      const last = angles[angles.length - 1] ?? Number.NaN;
      const peak = Math.max(...angles.map((angle) => Math.abs(angle)));
      console.log(
        `${locale} ${viewport.name} december first=${first.toFixed(2)} last=${last.toFixed(2)} peak=${peak.toFixed(2)} samples=${angles.length}`,
      );
      expect(Math.abs(first)).toBeLessThanOrEqual(32);
      expect(Math.abs(first)).toBeGreaterThan(18);
      expect(peak).toBeLessThanOrEqual(40);
      expect(Math.abs(last)).toBeLessThanOrEqual(2);
      expect(Math.sign(first)).toBe(sign);
      expect(movesTowardZero(angles, sign)).toBe(true);
      const offSquare = frames.flatMap((frame) => frame.labels.filter((label) => labelOffSquare(label)));
      expect(offSquare).toEqual([]);
      expect(foreign).toEqual([]);
    });

    test(`fails axe at the settled September guide at ${locale} ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`/${locale}/guide?month=8`);
      expect(response?.ok()).toBe(true);
      await page.locator('a[data-month="9"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=9$`));
      await expect.poll(async () => Math.abs(await labelAngle(page, "9"))).toBeLessThanOrEqual(2);
      await expect.poll(async () => page.locator('li[data-flip-id="watermelon"]').getAttribute("hidden")).toBe("");
      await waitStable(page);
      const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations.violations).toEqual([]);
    });
  }
}

test.describe("guide turn under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const locale of ["en", "ar"] as const) {
    for (const viewport of VIEWPORTS) {
      test(`keeps a transform or a fade after the month click when motion is reduced at ${locale} ${viewport.name}`, async ({
        page,
      }) => {
        const foreign: string[] = [];
        watchRequests(page, foreign);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(`/${locale}/guide?month=8`);
        expect(response?.ok()).toBe(true);
        await beginRecording(page);
        await markClick(page);
        await page.locator('a[data-month="9"]').click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=9$`));
        await expect.poll(async () => page.evaluate(() => (window as Window & { __frames?: unknown[] }).__frames?.length ?? 0)).toBeGreaterThan(3);
        const recorded = await stopRecording(page);
        const frames = recorded.frames.filter((frame) => frame.t >= recorded.mark);
        const dirty = frames.flatMap((frame) => {
          const found: string[] = [];
          if (!identityTransform(frame.turnTransform) || frame.turnInline.trim().length > 0) found.push(`turn:${frame.turnTransform}:${frame.turnInline}`);
          for (const wrap of frame.wraps) {
            if (!identityTransform(wrap.transform) || wrap.inline.trim().length > 0 || wrap.opacity < 0.99) {
              found.push(`wrap:${wrap.transform}:opacity=${wrap.opacity}:inline=${wrap.inline}`);
            }
          }
          for (const card of frame.cards) {
            if (!identityTransform(card.transform) || card.opacity < 0.99 || card.inline.trim().length > 0) {
              found.push(`${card.id}:${card.transform}:opacity=${card.opacity}:inline=${card.inline}`);
            }
          }
          return found;
        });
        const wrappers = await page.locator("[data-dial-label]").evaluateAll((elements) =>
          elements.map((element) => ({
            transform: getComputedStyle(element).transform,
            inline: element.getAttribute("style") ?? "",
            opacity: getComputedStyle(element).opacity,
          })),
        );
        console.log(
          `${locale} ${viewport.name} reduced frames=${frames.length} dirty=${dirty.length} wrappers=${wrappers.map((item) => item.transform).join(",")}`,
        );
        expect(dirty).toEqual([]);
        expect(wrappers.every((item) => identityTransform(item.transform) && item.inline.trim().length === 0 && Number(item.opacity) >= 0.99)).toBe(true);
        expect(foreign).toEqual([]);
      });
    }
  }
});

test.describe("guide turn without javascript", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of ["en", "ar"] as const) {
    for (const viewport of VIEWPORTS) {
      test(`shows the wrong September slugs or loses aria-current without JavaScript at ${locale} ${viewport.name}`, async ({
        page,
      }) => {
        const foreign: string[] = [];
        watchRequests(page, foreign);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        expect(slugsInMonth(9)).toEqual([...SEPTEMBER]);
        const response = await page.goto(`/${locale}/guide?month=8`);
        expect(response?.ok()).toBe(true);
        // Next streams this dynamic page into a hidden slot. The attribute is the framework shell.
        await page.evaluate(() => {
          for (const node of document.querySelectorAll("div[hidden][id^='S:']")) node.removeAttribute("hidden");
        });
        await page.locator('a[data-month="9"]').click();
        await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=9$`));
        const visible = await page.locator("li[data-flip-id]:not([hidden])").evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-flip-id") ?? ""),
        );
        console.log(`${locale} ${viewport.name} nojs slugs=${visible.join(",")}`);
        expect(visible).toEqual([...SEPTEMBER]);
        await expect(page.locator('a[data-month="9"]')).toHaveAttribute("aria-current", "true");
        expect(foreign).toEqual([]);
      });
    }
  }
});
