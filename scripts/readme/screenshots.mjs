import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(repoRoot, "docs", "screenshots");

const pages = [
  { page: "home", path: (locale) => `/${locale}`, ready: "[data-dial-label]" },
  { page: "guide", path: (locale) => `/${locale}/guide?month=8`, ready: "[data-flip-id]" },
  { page: "mango", path: (locale) => `/${locale}/produce/mango`, ready: "[data-arc-tick]" },
];
const locales = ["en", "ar"];
const themes = ["light", "dark"];

function localOrigin(raw) {
  const url = new URL(raw);
  if (url.protocol !== "http:") throw new Error("screenshots run only against the local server");
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("screenshots run only against the local server");
  }
  return url.origin;
}

function pngSize(file) {
  const bytes = readFileSync(file);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function chooseDark(page) {
  const button = page.locator('[data-theme-choice="dark"]');
  await button.waitFor({ state: "visible" });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if ((await page.locator("html").getAttribute("data-theme")) === "dark") return;
    await button.click();
    const applied = await page
      .waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark", { timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
    if (applied) return;
  }
  throw new Error("dark choice did not apply");
}

async function settlePaint(page) {
  await page.waitForFunction(() => {
    if (document.documentElement.hasAttribute("data-theme-fade")) return false;
    return document.getAnimations().every((animation) => {
      const iterations = animation.effect?.getTiming?.().iterations;
      return iterations === Infinity || animation.playState !== "running";
    });
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const probe = document.createElement("div");
    probe.style.background = "var(--color-bg)";
    document.body.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return getComputedStyle(document.body).backgroundColor === expected;
  });
  await page.waitForFunction(() => {
    for (const node of document.querySelectorAll("img")) {
      if (!(node instanceof HTMLImageElement)) continue;
      const box = node.getBoundingClientRect();
      const inView =
        box.width > 0 &&
        box.height > 0 &&
        box.bottom > 0 &&
        box.right > 0 &&
        box.top < window.innerHeight &&
        box.left < window.innerWidth;
      if (!inView) continue;
      if (!node.complete || node.naturalWidth < 1) return false;
    }
    return true;
  });
}

async function captureOne(browser, origin, screen, locale, theme) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const problems = [];
  page.on("pageerror", (error) => problems.push(error instanceof Error ? error.message : String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("requestfailed", (request) => {
    let host = "";
    try {
      host = new URL(request.url()).origin;
    } catch {
      host = "";
    }
    if (host === origin) problems.push(`failed ${request.failure()?.errorText ?? "request"}`);
  });
  page.on("response", (response) => {
    let host = "";
    try {
      host = new URL(response.url()).origin;
    } catch {
      host = "";
    }
    if (host === origin && response.status() >= 400) problems.push(`status ${response.status()}`);
  });
  await page.route("**/*", (route) => {
    const target = route.request().url();
    if (target.startsWith("data:") || target.startsWith("blob:")) return route.continue();
    let host = "";
    try {
      host = new URL(target).origin;
    } catch {
      return route.abort();
    }
    if (host === origin) return route.continue();
    return route.abort();
  });
  await page.addInitScript(() => {
    let total = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) total += entry.value;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
    Object.defineProperty(window, "__layoutShift", { get: () => total });
  });
  try {
    await page.goto(`${origin}${screen.path(locale)}`, { waitUntil: "load" });
    await page.locator(screen.ready).first().waitFor({ state: "visible" });
    if (theme === "dark") await chooseDark(page);
    else if ((await page.locator("html").getAttribute("data-theme")) !== null) {
      throw new Error("light capture was not the system light scheme");
    }
    await settlePaint(page);
    const shift = await page.evaluate(() => window.__layoutShift ?? 0);
    if (shift > 0) throw new Error(`layout shift ${shift}`);
    if (problems.length > 0) throw new Error(problems[0]);
    const name = `${screen.page}-${locale}-${theme}.png`;
    const file = join(outDir, name);
    await page.screenshot({ path: file, fullPage: false, scale: "css", type: "png" });
    const size = pngSize(file);
    if (size.width !== 1280 || size.height !== 800) throw new Error(`capture ${size.width}x${size.height}`);
    console.log(`readme ${screen.page} ${locale} ${theme}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const origin = localOrigin(process.argv[2] ?? "http://127.0.0.1:4173");
  const browser = await chromium.launch();
  try {
    for (const locale of locales) {
      for (const screen of pages) {
        for (const theme of themes) {
          await captureOne(browser, origin, screen, locale, theme);
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/\/(?:home|Users)\/\S+/g, "[redacted]"));
  process.exit(1);
});
