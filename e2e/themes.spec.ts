import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const LOCALES = ["en", "ar"] as const;
const WIDTHS = [390, 1280] as const;
const GROUND = {
  light: "rgb(246, 239, 227)",
  dark: "rgb(18, 32, 26)",
} as const;

type LocaleCode = (typeof LOCALES)[number];
type SchemeName = keyof typeof GROUND;
type ThemeLabel = "system-light" | "system-dark" | "light" | "dark";

type Rgba = { r: number; g: number; b: number; a: number };

const pages = [
  { name: "home", path: (locale: LocaleCode) => `/${locale}`, ready: "[data-dial-label]" },
  { name: "guide", path: (locale: LocaleCode) => `/${locale}/guide?month=8`, ready: "[data-flip-id]" },
  { name: "chart", path: (locale: LocaleCode) => `/${locale}/guide?month=8&view=chart`, ready: "[data-chart-head]" },
  { name: "mango", path: (locale: LocaleCode) => `/${locale}/produce/mango`, ready: "[data-arc-tick]" },
  { name: "molokhia", path: (locale: LocaleCode) => `/${locale}/produce/molokhia`, ready: "[data-arc-tick]" },
  { name: "about", path: (locale: LocaleCode) => `/${locale}/about`, ready: "h1" },
] as const;

const photoPages = new Set(["home", "guide", "mango", "molokhia"]);

function pass(pageName: string, locale: LocaleCode, width: number, theme: ThemeLabel, check: string): void {
  console.log(`themes ${pageName} ${locale} ${width} ${theme} ${check}=ok`);
}

function parseCssColor(value: string): Rgba {
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(value.trim());
  if (!match) throw new Error(`unparsed colour ${value}`);
  const alphaRaw = match[4];
  let alpha = 1;
  if (alphaRaw) alpha = alphaRaw.endsWith("%") ? Number.parseFloat(alphaRaw) / 100 : Number.parseFloat(alphaRaw);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(fg: Rgba, ground: Rgba): number {
  const paint = (color: Rgba): Rgba =>
    color.a >= 1
      ? color
      : {
          r: color.r * color.a + 255 * (1 - color.a),
          g: color.g * color.a + 255 * (1 - color.a),
          b: color.b * color.a + 255 * (1 - color.a),
          a: 1,
        };
  const lum = (color: Rgba) => {
    const opaque = paint(color);
    return 0.2126 * channel(opaque.r) + 0.7152 * channel(opaque.g) + 0.0722 * channel(opaque.b);
  };
  const lighter = Math.max(lum(fg), lum(ground));
  const darker = Math.min(lum(fg), lum(ground));
  return (lighter + 0.05) / (darker + 0.05);
}

async function revealSettled(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        if (document.documentElement.hasAttribute("data-theme-fade")) return false;
        return document.getAnimations().every((animation) => {
          const effect = animation.effect;
          if (!(effect instanceof KeyframeEffect)) return true;
          const pseudo = effect.pseudoElement ?? "";
          if (!pseudo.includes("view-transition")) return true;
          return animation.playState !== "running";
        });
      }),
    )
    .toBe(true);
}

async function pressChoice(page: Page, choice: SchemeName): Promise<void> {
  const button = page.locator(`[data-theme-choice="${choice}"]`);
  await expect(button).toBeVisible();
  await expect
    .poll(
      async () => {
        const theme = await page.locator("html").getAttribute("data-theme");
        if (theme === choice) return theme;
        await button.click();
        return page.locator("html").getAttribute("data-theme");
      },
      { timeout: 10_000 },
    )
    .toBe(choice);
  await revealSettled(page);
  await expect(page.locator("body")).toHaveCSS("background-color", GROUND[choice]);
}

async function axeClean(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags([...AXE_TAGS]).analyze();
  if (result.violations.length > 0) {
    console.log(`axe-violation ${result.violations.map((violation) => `${violation.id}:${violation.nodes.length}`).join(",")}`);
  }
  expect(result.violations).toEqual([]);
}

async function focusRing(page: Page): Promise<void> {
  const reading = await page.evaluate(() => {
    const first = document.querySelector("a");
    if (!(first instanceof HTMLElement)) return null;
    first.focus(Object.assign({ preventScroll: true }, { focusVisible: true }));
    if (document.activeElement !== first || !first.matches(":focus-visible")) return null;
    const style = getComputedStyle(first);
    return {
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      ground: getComputedStyle(document.body).backgroundColor,
    };
  });
  expect(reading).not.toBeNull();
  expect(reading?.outlineStyle).toBe("solid");
  expect(reading?.outlineWidth).toBe("2px");
  const ratio = contrastRatio(parseCssColor(reading?.outlineColor ?? ""), parseCssColor(reading?.ground ?? ""));
  expect(ratio).toBeGreaterThanOrEqual(3);
}

async function hairline(page: Page, pageName: string): Promise<void> {
  const reading = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.borderTop = "1px solid var(--color-hairline)";
    document.body.append(probe);
    const expected = getComputedStyle(probe).borderTopColor;
    probe.remove();
    const frames: { width: string; color: string; bare: boolean }[] = [];
    for (const node of document.querySelectorAll("main img")) {
      if (!(node instanceof HTMLImageElement) || !(node.parentElement instanceof HTMLElement)) continue;
      const style = getComputedStyle(node.parentElement);
      const bordered = style.borderTopStyle !== "none" && style.borderTopWidth !== "0px";
      if (!bordered) {
        if (node.alt !== "") frames.push({ width: style.borderTopWidth, color: "", bare: true });
        continue;
      }
      frames.push({ width: style.borderTopWidth, color: style.borderTopColor, bare: false });
    }
    return { expected, frames };
  });
  for (const frame of reading.frames) {
    expect(frame.bare).toBe(false);
    expect(frame.width).toBe("1px");
    expect(frame.color).toBe(reading.expected);
  }
  if (photoPages.has(pageName)) expect(reading.frames.length).toBeGreaterThan(0);
}

async function check(page: Page, pageName: string, locale: LocaleCode, width: number, theme: ThemeLabel): Promise<void> {
  await axeClean(page);
  pass(pageName, locale, width, theme, "axe");
  await focusRing(page);
  pass(pageName, locale, width, theme, "focus");
  await hairline(page, pageName);
  pass(pageName, locale, width, theme, "hairline");
}

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    for (const screen of pages) {
      test(`lets ${screen.name} fail axe, hide the focus ring, or drop a photo-frame hairline (${locale} ${width})`, async ({
        page,
      }) => {
        test.setTimeout(240_000);
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme: "light" });
        await page.goto(screen.path(locale));
        await expect(page.locator(screen.ready).first()).toBeVisible();
        await expect(page.locator("html")).not.toHaveAttribute("data-theme");
        await expect(page.locator("body")).toHaveCSS("background-color", GROUND.light);
        await check(page, screen.name, locale, width, "system-light");

        await page.emulateMedia({ colorScheme: "dark" });
        await expect(page.locator("html")).not.toHaveAttribute("data-theme");
        await expect(page.locator("body")).toHaveCSS("background-color", GROUND.dark);
        await check(page, screen.name, locale, width, "system-dark");

        await pressChoice(page, "light");
        await check(page, screen.name, locale, width, "light");

        await pressChoice(page, "dark");
        await check(page, screen.name, locale, width, "dark");
      });
    }
  }
}
