import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const GROUND = {
  light: "rgb(246, 239, 227)",
  dark: "rgb(18, 32, 26)",
} as const;

const PAGES = [
  { path: "/ar", bands: ["hero", "heading"] },
  { path: "/en", bands: ["hero", "heading"] },
  { path: "/en/guide?month=8", bands: ["guide"] },
  { path: "/ar/about", bands: ["about"] },
] as const;

const SCHEMES = ["light", "dark"] as const;

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

async function textureLayer(band: Locator): Promise<Locator> {
  const hidden = band.locator("> [aria-hidden='true']");
  await expect(hidden.first()).toBeAttached();
  const count = await hidden.count();
  const matched: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const opacity = await hidden.nth(index).evaluate((element) => getComputedStyle(element).opacity);
    if (opacity === "0.08") matched.push(index);
  }
  expect(matched).toEqual([0]);
  return hidden.nth(0);
}

async function readLayer(page: Page, name: string): Promise<{ opacity: string; pointerEvents: string; focusable: boolean }> {
  const band = page.locator(`[data-texture-band="${name}"]`);
  await expect(band).toHaveCount(1);
  await expect(band).toHaveCSS("position", "relative");
  await expect(band).toHaveCSS("isolation", "isolate");
  const layer = await textureLayer(band);
  await expect(layer).toHaveAttribute("aria-hidden", "true");
  await expect(layer).not.toHaveAttribute("tabindex");
  const opacity = await layer.evaluate((element) => getComputedStyle(element).opacity);
  const pointerEvents = await layer.evaluate((element) => getComputedStyle(element).pointerEvents);
  const focusable = await layer.evaluate((element) => {
    const node = element as HTMLElement;
    const interactive = "a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])";
    return node.tabIndex >= 0 || node.matches(interactive) || node.querySelector(interactive) !== null;
  });
  return { opacity, pointerEvents, focusable };
}

for (const scheme of SCHEMES) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    for (const entry of PAGES) {
      test(`shows a decorative 8% weave on ${entry.path} and leaves the page ground alone`, async ({ page }) => {
        const foreign: string[] = [];
        page.on("request", (request) => rememberForeign(request.url(), foreign));
        page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));

        const response = await page.goto(entry.path);
        expect(response?.ok()).toBe(true);
        await expect(page.locator("body")).toHaveCSS("background-color", GROUND[scheme]);

        const readings: string[] = [];
        for (const name of entry.bands) {
          const reading = await readLayer(page, name);
          readings.push(`${name} opacity=${reading.opacity} pointer-events=${reading.pointerEvents}`);
          expect(reading.opacity).toBe("0.08");
          expect(reading.pointerEvents).toBe("none");
          expect(reading.focusable).toBe(false);
        }

        if (entry.path === "/ar/about") {
          await expect(page.locator("section [data-texture-band]")).toHaveCount(0);
          await expect(page.locator("section pattern")).toHaveCount(0);
        }

        await page.evaluate(async () => {
          if (document.fonts) await document.fonts.ready;
        });
        await expect
          .poll(() =>
            page.evaluate(
              () => (document.getAnimations?.() ?? []).filter((anim) => anim.playState === "running").length,
            ),
          )
          .toBe(0);

        const axe = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        console.log(
          `texture ${scheme} ${entry.path} ${readings.join("; ")} ground=${GROUND[scheme]} axe=${axe.violations.length}`,
        );
        expect(axe.violations).toEqual([]);
        expect(foreign).toEqual([]);
      });
    }
  });
}
