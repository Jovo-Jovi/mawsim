import { readFileSync } from "node:fs";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const LOCALES = ["en", "ar"] as const;
const WIDTHS = [1280, 390] as const;
const DARK_GROUND = "rgb(18, 32, 26)";
const BASE = "http://127.0.0.1:4173";
const CLIP = "::view-transition-new(root)";

type LocaleCode = (typeof LOCALES)[number];

type ClipSnapshot = {
  duration: number;
  easing: string;
  tokenEase: string;
  firstX: number;
  firstY: number;
  lastRadius: number;
  centerX: number;
  centerY: number;
  farthest: number;
  viewportWidth: number;
};

type Box = { x: number; y: number; w: number; h: number };

type FallbackRead = { matched: boolean; duration: number; fade: boolean };

type ReducedFrame = { bg: string; transitions: number; calls: number; fade: boolean };

function report(locale: LocaleCode, width: number, line: string): void {
  console.log(`theme-reveal ${locale} ${width} ${line}`);
}

function canonicalEase(value: string): string {
  return value.replace(/\s+/g, "").replace(/-?\d*\.?\d+/g, (part) => String(Number(part)));
}

function catalogue(locale: LocaleCode): { theme: { dark: string } } {
  return JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8")) as {
    theme: { dark: string };
  };
}

function countViewTransitions(): void {
  const original = Document.prototype.startViewTransition;
  let calls = 0;
  Object.defineProperty(window, "__viewTransitionCalls", {
    configurable: true,
    get() {
      return calls;
    },
  });
  if (typeof original !== "function") return;
  Document.prototype.startViewTransition = function (this: Document, ...args: Parameters<Document["startViewTransition"]>) {
    calls += 1;
    return original.apply(this, args);
  };
}

function removeViewTransition(): void {
  const prototype = Document.prototype as { startViewTransition?: Document["startViewTransition"] };
  delete prototype.startViewTransition;
}

async function readClip(page: Page): Promise<ClipSnapshot | null> {
  return page.evaluate((pseudo) => {
    const parseCircle = (value: string): { radius: number; x: number; y: number } | null => {
      const match = /circle\(\s*([0-9.]+)px\s+at\s+([0-9.]+)px\s+([0-9.]+)px\s*\)/.exec(value);
      if (!match || match[1] === undefined || match[2] === undefined || match[3] === undefined) return null;
      return { radius: Number(match[1]), x: Number(match[2]), y: Number(match[3]) };
    };
    const running = document.getAnimations().filter((anim) => {
      const effect = anim.effect;
      return anim.playState === "running" && effect instanceof KeyframeEffect && effect.pseudoElement === pseudo;
    });
    const effect = running[0]?.effect;
    if (running.length !== 1 || !(effect instanceof KeyframeEffect)) return null;
    const frames = effect.getKeyframes();
    const first = frames[0];
    const last = frames[frames.length - 1];
    const firstCircle = typeof first?.clipPath === "string" ? parseCircle(first.clipPath) : null;
    const lastCircle = typeof last?.clipPath === "string" ? parseCircle(last.clipPath) : null;
    const button = document.querySelector("[data-theme-choice='dark']");
    if (!firstCircle || !lastCircle || !(button instanceof HTMLElement)) return null;
    const box = button.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const farthest = Math.max(
      Math.hypot(firstCircle.x, firstCircle.y),
      Math.hypot(width - firstCircle.x, firstCircle.y),
      Math.hypot(firstCircle.x, height - firstCircle.y),
      Math.hypot(width - firstCircle.x, height - firstCircle.y),
    );
    const timing = effect.getTiming();
    return {
      duration: typeof timing.duration === "number" ? timing.duration : Number.NaN,
      easing: typeof timing.easing === "string" ? timing.easing : "",
      tokenEase: getComputedStyle(document.documentElement).getPropertyValue("--ease-in-out"),
      firstX: firstCircle.x,
      firstY: firstCircle.y,
      lastRadius: lastCircle.radius,
      centerX,
      centerY,
      farthest,
      viewportWidth: width,
    };
  }, CLIP);
}

async function clipLive(page: Page): Promise<boolean> {
  return page.evaluate((pseudo) => {
    return document.getAnimations().some((anim) => {
      const effect = anim.effect;
      return (
        ((anim.playState as string) === "running" || (anim.playState as string) === "pending") &&
        effect instanceof KeyframeEffect &&
        effect.pseudoElement === pseudo
      );
    });
  }, CLIP);
}

async function themeName(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

async function activeChoice(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute("data-theme-choice") ?? null);
}

async function readBoxes(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    return [...document.querySelectorAll("body *")].map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, w: box.width, h: box.height };
    });
  });
}

function sameBoxes(before: Box[], after: Box[]): boolean {
  if (before.length !== after.length) return false;
  return before.every((box, index) => {
    const next = after[index];
    return next !== undefined && box.x === next.x && box.y === next.y && box.w === next.w && box.h === next.h;
  });
}

async function settledBoxes(page: Page): Promise<Box[]> {
  await page.evaluate(() => document.fonts.ready);
  let previous = await readBoxes(page);
  await expect
    .poll(async () => {
      const next = await readBoxes(page);
      const same = sameBoxes(previous, next);
      previous = next;
      return same;
    })
    .toBe(true);
  return previous;
}

async function pressDarkUntilClip(page: Page): Promise<ClipSnapshot> {
  let snapshot: ClipSnapshot | null = null;
  await expect
    .poll(async () => {
      snapshot = await readClip(page);
      if (snapshot) return "running";
      if ((await themeName(page)) === "dark") return "waiting";
      await page.locator("[data-theme-choice='dark']").click();
      return "pressed";
    })
    .toBe("running");
  if (!snapshot) throw new Error("the circle never started");
  return snapshot;
}

async function waitUntilClipEnds(page: Page): Promise<void> {
  await page.evaluate((pseudo) => {
    const clip = document.getAnimations().find((anim) => {
      const effect = anim.effect;
      return effect instanceof KeyframeEffect && effect.pseudoElement === pseudo;
    });
    if (!clip) return Promise.resolve();
    return clip.finished.then(
      () => undefined,
      () => undefined,
    );
  }, CLIP);
  await expect.poll(async () => (await clipLive(page)) === false && (await themeName(page)) === "dark").toBe(true);
}

async function openFresh(
  browser: Browser,
  width: number,
  options: { reduced?: boolean; init?: () => void },
): Promise<{ context: BrowserContext; page: Page }> {
  if (!browser) throw new Error("browser missing");
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    colorScheme: "light",
    reducedMotion: options.reduced ? "reduce" : "no-preference",
    baseURL: BASE,
  });
  if (options.init) await context.addInitScript(options.init);
  const page = await context.newPage();
  return { context, page };
}

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    test(`the circle misses the switch, or motion survives when the painted theme does not change (${locale} ${width})`, async ({
      page,
      browser,
    }) => {
      test.setTimeout(180_000);
      const copy = catalogue(locale);
      let reducedContext: BrowserContext | null = null;
      let fallbackContext: BrowserContext | null = null;
      try {
        await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`/${locale}`);
        await expect(page.getByRole("button", { name: copy.theme.dark })).toBeVisible();
        const before = await settledBoxes(page);
        const mark = await page.evaluate(() => {
          const bucket: { value: number; startTime: number }[] = [];
          Object.assign(window, { __revealShifts: bucket });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as PerformanceEntry & { value?: number };
              if (typeof shift.value !== "number") continue;
              bucket.push({ value: shift.value, startTime: entry.startTime });
            }
          }).observe({ type: "layout-shift", buffered: true });
          return performance.now();
        });

        const clip = await pressDarkUntilClip(page);
        expect(Math.abs(clip.firstX - clip.centerX)).toBeLessThanOrEqual(1);
        expect(Math.abs(clip.firstY - clip.centerY)).toBeLessThanOrEqual(1);
        expect(Math.abs(clip.lastRadius - clip.farthest)).toBeLessThanOrEqual(1);
        expect(locale === "en" ? clip.firstX > clip.viewportWidth / 2 : clip.firstX < clip.viewportWidth / 2).toBe(true);
        expect(clip.duration).toBe(500);
        expect(canonicalEase(clip.tokenEase).length).toBeGreaterThan(0);
        expect(canonicalEase(clip.easing)).toBe(canonicalEase(clip.tokenEase));
        report(locale, width, "origin=ok");
        report(locale, width, `timing=${clip.duration} ease=${clip.easing}`);

        await waitUntilClipEnds(page);
        expect(await activeChoice(page)).toBe("dark");
        expect(await themeName(page)).toBe("dark");
        report(locale, width, "focus=kept");

        const after = await readBoxes(page);
        const shift = await page.evaluate((started) => {
          const bucket =
            (window as unknown as { __revealShifts?: { value: number; startTime: number }[] }).__revealShifts ?? [];
          return bucket.filter((entry) => entry.startTime >= started).reduce((sum, entry) => sum + entry.value, 0);
        }, mark);
        expect(shift).toBe(0);
        expect(sameBoxes(before, after)).toBe(true);

        await page.locator("[data-theme-choice='dark']").click();
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
        );
        expect(await clipLive(page)).toBe(false);
        expect(await themeName(page)).toBe("dark");

        await page.locator("[data-theme-choice='system']").click();
        await expect.poll(() => clipLive(page)).toBe(true);
        await expect
          .poll(async () => (await clipLive(page)) === false && (await themeName(page)) === null)
          .toBe(true);
        await page.locator("[data-theme-choice='light']").click();
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
        );
        expect(await clipLive(page)).toBe(false);
        expect(await themeName(page)).toBe("light");
        report(locale, width, "same=none");

        const errors: string[] = [];
        const onConsole = (message: { type(): string; text(): string }): void => {
          if (message.type() === "error") errors.push(message.text());
        };
        const onPageError = (error: Error): void => {
          errors.push(error.message);
        };
        page.on("console", onConsole);
        page.on("pageerror", onPageError);
        try {
          for (let step = 0; step < 12; step += 1) {
            if ((await activeChoice(page)) === "dark") break;
            await page.keyboard.press("Tab");
          }
          expect(await activeChoice(page)).toBe("dark");
          await page.evaluate((pseudo) => {
            let max = 0;
            const sample = (): void => {
              const live = document.getAnimations().filter((anim) => {
                const effect = anim.effect;
                return (
                  ((anim.playState as string) === "running" || (anim.playState as string) === "pending") &&
                  effect instanceof KeyframeEffect &&
                  effect.pseudoElement === pseudo
                );
              }).length;
              if (live > max) max = live;
              Object.assign(window, { __clipMax: max });
              requestAnimationFrame(sample);
            };
            Object.assign(window, { __clipMax: 0 });
            sample();
          }, CLIP);
          await page.keyboard.press("Enter");
          await expect.poll(() => clipLive(page)).toBe(true);
          await page.keyboard.press("Shift+Tab");
          expect(await activeChoice(page)).toBe("light");
          await page.keyboard.press("Enter");
          await expect
            .poll(async () => (await clipLive(page)) === false && (await themeName(page)) === "light")
            .toBe(true);
          const max = await page.evaluate(() => (window as unknown as { __clipMax?: number }).__clipMax ?? 99);
          expect(max).toBeLessThanOrEqual(1);
          expect(errors).toEqual([]);
        } finally {
          page.off("console", onConsole);
          page.off("pageerror", onPageError);
        }
        report(locale, width, "twice=ok");

        const reduced = await openFresh(browser, width, { reduced: true, init: countViewTransitions });
        reducedContext = reduced.context;
        await reduced.page.goto(`/${locale}`);
        await expect(reduced.page.getByRole("button", { name: copy.theme.dark })).toBeVisible();
        await expect
          .poll(async () => {
            return reduced.page.evaluate(() => {
              const holder = window as unknown as { __reducedFrame?: ReducedFrame; __viewTransitionCalls?: number };
              if (holder.__reducedFrame) return holder.__reducedFrame;
              const button = document.querySelector("[data-theme-choice='dark']");
              if (!(button instanceof HTMLButtonElement)) return null;
              const root = document.documentElement;
              if (root.getAttribute("data-theme") === "dark") return null;
              const beforeCalls = holder.__viewTransitionCalls ?? 0;
              let saw = root.hasAttribute("data-theme-fade");
              const observer = new MutationObserver(() => {
                if (root.hasAttribute("data-theme-fade")) saw = true;
              });
              observer.observe(root, { attributes: true, attributeFilter: ["data-theme-fade"] });
              button.click();
              if (root.getAttribute("data-theme") !== "dark") {
                observer.disconnect();
                return null;
              }
              return new Promise<ReducedFrame>((resolve) => {
                requestAnimationFrame(() => {
                  observer.disconnect();
                  const transitions = document.getAnimations().filter((anim) => {
                    if (!(anim instanceof CSSTransition) || !(anim.effect instanceof KeyframeEffect)) return false;
                    const target = anim.effect.target;
                    return target === document.body || target === document.documentElement;
                  }).length;
                  const frame = {
                    bg: getComputedStyle(document.body).backgroundColor,
                    transitions,
                    calls: (holder.__viewTransitionCalls ?? 0) - beforeCalls,
                    fade: saw || root.hasAttribute("data-theme-fade"),
                  };
                  holder.__reducedFrame = frame;
                  resolve(frame);
                });
              });
            });
          })
          .toEqual({ bg: DARK_GROUND, transitions: 0, calls: 0, fade: false });
        report(locale, width, "reduced=instant");

        const fallback = await openFresh(browser, width, { init: removeViewTransition });
        fallbackContext = fallback.context;
        await fallback.page.goto(`/${locale}`);
        await expect(fallback.page.getByRole("button", { name: copy.theme.dark })).toBeVisible();
        await expect
          .poll(() => fallback.page.evaluate(() => typeof document.startViewTransition !== "function"))
          .toBe(true);
        let fadeRead: FallbackRead | null = null;
        await expect
          .poll(async () => {
            fadeRead = await fallback.page.evaluate(() => {
              const holder = window as unknown as { __fallbackRead?: FallbackRead };
              if (holder.__fallbackRead) return holder.__fallbackRead;
              const button = document.querySelector("[data-theme-choice='dark']");
              if (!(button instanceof HTMLButtonElement)) return null;
              const root = document.documentElement;
              if (root.getAttribute("data-theme") === "dark") return null;
              button.click();
              const theme = root.getAttribute("data-theme");
              const rows = document.getAnimations().flatMap((anim) => {
                if (!(anim instanceof CSSTransition) || !(anim.effect instanceof KeyframeEffect)) return [];
                const duration = anim.effect.getTiming().duration;
                return [
                  {
                    target: anim.effect.target === document.body ? "body" : "other",
                    property: anim.transitionProperty,
                    duration: typeof duration === "number" ? duration : null,
                  },
                ];
              });
              const match = rows.find(
                (row) => row.target === "body" && row.property === "background-color" && row.duration === 200,
              );
              if (!match) {
                if (theme !== "dark") return null;
                const missed: FallbackRead = { matched: false, duration: -1, fade: root.hasAttribute("data-theme-fade") };
                holder.__fallbackRead = missed;
                return missed;
              }
              const read: FallbackRead = {
                matched: true,
                duration: match.duration ?? 200,
                fade: root.hasAttribute("data-theme-fade"),
              };
              holder.__fallbackRead = read;
              return read;
            });
            return fadeRead;
          })
          .toEqual({ matched: true, duration: 200, fade: true });
        await expect
          .poll(() => fallback.page.evaluate(() => document.documentElement.hasAttribute("data-theme-fade")))
          .toBe(false);
        const fallbackMs = await fallback.page.evaluate(() => {
          const holder = window as unknown as { __fallbackRead?: { duration?: number } };
          return holder.__fallbackRead?.duration ?? -1;
        });
        expect(fallbackMs).toBe(200);
        report(locale, width, `fallback=${fallbackMs}`);

        expect(shift).toBe(0);
        report(locale, width, "shift=0");
      } finally {
        await reducedContext?.close();
        await fallbackContext?.close();
      }
    });
  }
}
