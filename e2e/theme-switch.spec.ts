import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

const LOCALES = ["ar", "en"] as const;
const WIDTHS = [390, 1280] as const;
const STORAGE_KEY = "mawsim-theme";

type LocaleCode = (typeof LOCALES)[number];
type ThemeName = "system" | "light" | "dark";

const GROUND = {
  light: "rgb(246, 239, 227)",
  dark: "rgb(18, 32, 26)",
} as const;

type ThemeCopy = {
  nav: { guide: string };
  language: { switch: string };
  theme: { label: string; system: string; light: string; dark: string };
};

type ThemeFrame = { theme: string | null; bg: string };
type Box = { x: number; y: number; w: number; h: number };

function catalogue(locale: LocaleCode): ThemeCopy {
  return JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8")) as ThemeCopy;
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

function carriesChoice(url: string, body: string | null): boolean {
  const haystack = `${url}\n${body ?? ""}`;
  if (haystack.includes(STORAGE_KEY)) return true;
  return /\b(dark|light|system)\b/.test(haystack);
}

function report(locale: LocaleCode, width: number, line: string): void {
  console.log(`theme-switch ${locale} ${width} ${line}`);
}

function installFirstFrameProbe(): void {
  requestAnimationFrame(() => {
    const take = (): void => {
      const body = document.body;
      if (!body) {
        requestAnimationFrame(take);
        return;
      }
      const root = document.documentElement;
      Object.assign(window, {
        __themeFirst: {
          theme: root.getAttribute("data-theme"),
          bg: getComputedStyle(body).backgroundColor,
        },
      });
    };
    take();
  });
}

function blockStorageMethods(): void {
  const fail = (): never => {
    throw new Error("blocked");
  };
  Storage.prototype.getItem = fail;
  Storage.prototype.setItem = fail;
  Storage.prototype.removeItem = fail;
  Storage.prototype.clear = fail;
  Storage.prototype.key = fail;
}

function blockStorageGetter(): void {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get(): Storage {
      throw new Error("blocked");
    },
  });
}

function scriptBeforeBody(html: string): boolean {
  const scriptAt = html.indexOf('src="/theme-init.js"');
  const bodyAt = html.indexOf("<body");
  return scriptAt >= 0 && bodyAt > scriptAt;
}

async function readFirst(page: Page): Promise<ThemeFrame> {
  await page.waitForFunction(() => {
    const holder = window as unknown as { __themeFirst?: ThemeFrame };
    return holder.__themeFirst !== undefined;
  });
  return page.evaluate(() => {
    const holder = window as unknown as { __themeFirst: ThemeFrame };
    return holder.__themeFirst;
  });
}

async function shellBoxes(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    const nodes = [
      document.querySelector("header"),
      document.querySelector("main"),
      ...document.querySelectorAll("[data-theme-choice]"),
    ];
    return nodes.map((node) => {
      if (!(node instanceof Element)) return { x: -1, y: -1, w: -1, h: -1 };
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, w: box.width, h: box.height };
    });
  });
}

function sameBoxes(before: Box[], after: Box[]): boolean {
  if (before.length !== after.length || before.length !== 5) return false;
  return before.every((box, index) => {
    const next = after[index];
    if (!next) return false;
    return box.x === next.x && box.y === next.y && box.w === next.w && box.h === next.h;
  });
}

async function paintSettled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function activeChoice(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute("data-theme-choice") ?? null);
}

async function outlineWidth(page: Page): Promise<string> {
  return page.evaluate(() => {
    const current = document.activeElement;
    if (!(current instanceof HTMLElement)) return "";
    return getComputedStyle(current).outlineWidth;
  });
}

async function storedValue(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

async function storedKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(localStorage));
}

function choiceButton(page: Page, choice: ThemeName) {
  return page.locator(`[data-theme-choice="${choice}"]:visible`).first();
}

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    test(`forgets a choice, flashes the other theme, or lets it leave the browser (${locale} ${width})`, async ({
      page,
      browser,
    }) => {
      test.setTimeout(180_000);
      const copy = catalogue(locale);
      const foreign: string[] = [];
      const carried: string[] = [];
      let cookies = 0;

      const watch = (target: Page): void => {
        target.on("request", (request) => {
          rememberForeign(request.url(), foreign);
          if (carriesChoice(request.url(), request.postData())) carried.push(request.url());
        });
        target.on("websocket", (socket) => rememberForeign(socket.url(), foreign));
        target.on("response", (response) => {
          if (response.headers()["set-cookie"]) cookies += 1;
        });
      };

      watch(page);
      await page.addInitScript(installFirstFrameProbe);
      await page.emulateMedia({ colorScheme: "light" });
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/${locale}`);
      await expect(page.getByRole("group", { name: copy.theme.label })).toBeVisible();
      await expect(page.getByRole("button", { name: copy.theme.system })).toBeVisible();
      await expect(page.getByRole("button", { name: copy.theme.light })).toBeVisible();
      await expect(page.getByRole("button", { name: copy.theme.dark })).toBeVisible();

      expect(await storedValue(page)).toBeNull();
      const placed = await page.evaluate(() => {
        const bar = document.querySelector("header > div");
        const group = document.querySelector("header [role='group']");
        if (!(bar instanceof HTMLElement) || !(group instanceof HTMLElement)) return null;
        const dir = document.documentElement.dir;
        const barBox = bar.getBoundingClientRect();
        const groupBox = group.getBoundingClientRect();
        const style = getComputedStyle(bar);
        const padEnd = Number.parseFloat(style.paddingInlineEnd);
        const borderEnd = Number.parseFloat(style.borderInlineEndWidth);
        const inset = padEnd + borderEnd;
        const barEnd = dir === "rtl" ? barBox.left + inset : barBox.right - inset;
        const groupEnd = dir === "rtl" ? groupBox.left : groupBox.right;
        const brand = bar.children[0];
        const tools = bar.children[2];
        if (!(brand instanceof HTMLElement) || !(tools instanceof HTMLElement)) return null;
        const brandBox = brand.getBoundingClientRect();
        const toolsBox = tools.getBoundingClientRect();
        const overlap = !(
          brandBox.right <= toolsBox.left ||
          toolsBox.right <= brandBox.left ||
          brandBox.bottom <= toolsBox.top ||
          toolsBox.bottom <= brandBox.top
        );
        return { delta: Math.abs(groupEnd - barEnd), overlap };
      });
      expect(placed).not.toBeNull();
      expect(placed?.delta ?? 99).toBeLessThanOrEqual(1);
      if (width === 390) expect(placed?.overlap).toBe(false);

      await page.setViewportSize({ width: 320, height: 800 });
      await expect
        .poll(async () => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(320);
      await page.setViewportSize({ width, height: 800 });
      report(locale, width, "placed=end");

      const minTarget = await page.evaluate(() => {
        const sizes = [...document.querySelectorAll("[data-theme-choice]")].flatMap((button) => {
          const box = button.getBoundingClientRect();
          return [box.width, box.height];
        });
        return Math.min(...sizes);
      });
      expect(minTarget).toBeGreaterThanOrEqual(44);
      report(locale, width, `targets=${Math.round(minTarget)}`);

      await expect(page.locator("[data-theme-choice='system']")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("[data-theme-choice][aria-pressed='true']")).toHaveCount(1);
      report(locale, width, "pressed=ok");

      const sequence: string[] = [];
      for (let step = 0; step < 12; step += 1) {
        await page.keyboard.press("Tab");
        const id = await page.evaluate(() => {
          const current = document.activeElement;
          if (!(current instanceof HTMLElement)) return "none";
          const choice = current.getAttribute("data-theme-choice");
          if (choice) return `choice:${choice}`;
          if (current.hasAttribute("hreflang")) return "language";
          return current.tagName.toLowerCase();
        });
        sequence.push(id);
        if (sequence.slice(-4).join(",") === "language,choice:system,choice:light,choice:dark") break;
      }
      expect(sequence.slice(-4)).toEqual(["language", "choice:system", "choice:light", "choice:dark"]);
      expect(await outlineWidth(page)).toBe("2px");
      await page.keyboard.press("Shift+Tab");
      expect(await activeChoice(page)).toBe("light");
      expect(await outlineWidth(page)).toBe("2px");
      await expect
        .poll(async () => {
          const theme = await page.locator("html").getAttribute("data-theme");
          if (theme === "light") return theme;
          await page.keyboard.press("Space");
          return page.locator("html").getAttribute("data-theme");
        })
        .toBe("light");
      await page.keyboard.press("Tab");
      expect(await activeChoice(page)).toBe("dark");
      await expect
        .poll(async () => {
          const theme = await page.locator("html").getAttribute("data-theme");
          if (theme === "dark") return theme;
          await page.keyboard.press("Enter");
          return page.locator("html").getAttribute("data-theme");
        })
        .toBe("dark");
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.dark);
      report(locale, width, "keys=ok");

      expect(await storedValue(page)).toBe("dark");
      expect(await storedKeys(page)).toEqual([STORAGE_KEY]);
      report(locale, width, "storage before=none after=dark");

      await choiceButton(page, "light").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.light);
      const mark = await page.evaluate(() => {
        const bucket: { value: number; startTime: number }[] = [];
        Object.assign(window, { __themeShifts: bucket });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { value?: number };
            if (typeof shift.value !== "number") continue;
            bucket.push({ value: shift.value, startTime: entry.startTime });
          }
        }).observe({ type: "layout-shift", buffered: true });
        return performance.now();
      });
      const before = await shellBoxes(page);
      await choiceButton(page, "dark").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await paintSettled(page);
      const after = await shellBoxes(page);
      const shift = await page.evaluate((started) => {
        const bucket =
          (window as unknown as { __themeShifts?: { value: number; startTime: number }[] }).__themeShifts ?? [];
        return bucket.filter((entry) => entry.startTime >= started).reduce((sum, entry) => sum + entry.value, 0);
      }, mark);
      expect(shift).toBe(0);
      expect(sameBoxes(before, after)).toBe(true);
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.dark);
      report(locale, width, "shift=0");

      await page.emulateMedia({ colorScheme: "dark" });
      await choiceButton(page, "light").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.light);
      report(locale, width, "chosen=dark|light");

      await page.emulateMedia({ colorScheme: "light" });
      await choiceButton(page, "dark").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.dark);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.dark);
      const reloadTheme = await page.locator("html").getAttribute("data-theme");
      await page.locator("header").getByRole("link", { name: copy.nav.guide, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide(?:\\?|$)`));
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const navTheme = await page.locator("html").getAttribute("data-theme");
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const backTheme = await page.locator("html").getAttribute("data-theme");
      await page.locator("header").getByRole("link", { name: copy.language.switch, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale === "ar" ? "en" : "ar"}$`));
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const langTheme = await page.locator("html").getAttribute("data-theme");
      report(locale, width, `persist reload=${reloadTheme} nav=${navTheme} back=${backTheme} lang=${langTheme}`);

      await choiceButton(page, "system").click();
      await expect(page.locator("html")).not.toHaveAttribute("data-theme");
      await page.emulateMedia({ colorScheme: "light" });
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.light);
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("body")).toHaveCSS("background-color", GROUND.dark);
      report(locale, width, "system follows=light,dark");

      await page.emulateMedia({ colorScheme: "light" });
      await page.evaluate((key) => localStorage.setItem(key, "dark"), STORAGE_KEY);
      await page.reload();
      const darkFrame = await readFirst(page);
      expect(darkFrame.theme).toBe("dark");
      expect(darkFrame.bg).toBe(GROUND.dark);
      await page.emulateMedia({ colorScheme: "dark" });
      await page.evaluate((key) => localStorage.setItem(key, "light"), STORAGE_KEY);
      await page.reload();
      const lightFrame = await readFirst(page);
      expect(lightFrame.theme).toBe("light");
      expect(lightFrame.bg).toBe(GROUND.light);
      report(locale, width, `firstframe dark=${darkFrame.theme} light=${lightFrame.theme}`);

      await assertStorageBlocked(browser, locale, width, "methods", watch);
      await assertStorageBlocked(browser, locale, width, "getter", watch);
      report(locale, width, "nostorage page=dark next=system");

      const served = await page.request.get("/ar", { headers: { accept: "text/html" } });
      expect(served.ok()).toBeTruthy();
      expect(scriptBeforeBody(await served.text())).toBe(true);
      expect(scriptBeforeBody(readFileSync(".next/server/app/_not-found.html", "utf8"))).toBe(true);
      report(locale, width, "headhtml=ok");

      expect(foreign).toEqual([]);
      expect(carried).toEqual([]);
      expect(cookies).toBe(0);
      report(locale, width, `requests foreign=${foreign.length} carried=${carried.length} cookie=${cookies}`);
    });
  }
}

async function assertStorageBlocked(
  browser: Browser,
  locale: LocaleCode,
  width: number,
  mode: "methods" | "getter",
  watch: (target: Page) => void,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    colorScheme: "light",
    baseURL: "http://127.0.0.1:4173",
  });
  const blocked = await context.newPage();
  watch(blocked);
  await blocked.addInitScript(mode === "methods" ? blockStorageMethods : blockStorageGetter);
  await blocked.goto(`/${locale}`);
  await expect(blocked.locator("[data-theme-choice='dark']")).toBeVisible();
  await expect
    .poll(async () => {
      const theme = await blocked.locator("html").getAttribute("data-theme");
      if (theme === "dark") return theme;
      await choiceButton(blocked, "dark").click();
      return blocked.locator("html").getAttribute("data-theme");
    })
    .toBe("dark");
  await expect(blocked.locator("body")).toHaveCSS("background-color", GROUND.dark);
  await blocked.reload();
  await expect(blocked.locator("html")).not.toHaveAttribute("data-theme");
  await expect(blocked.locator("body")).toHaveCSS("background-color", GROUND.light);
  await context.close();
}
