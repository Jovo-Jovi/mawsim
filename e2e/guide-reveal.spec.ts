import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PHONE = { width: 390, height: 500 };

const COPY = {
  en: { kinds: "Kinds", months: "Months", fruit: "Fruit" },
  ar: { kinds: "الأنواع", months: "الشهور", fruit: "فاكهة" },
} as const;

type Locale = keyof typeof COPY;

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

async function afterPaint(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 0);
          });
        });
      }),
  );
}

async function opacityOf(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).opacity);
}

async function animationName(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).animationName);
}

function monthLabel(page: Page, locale: Locale): Locator {
  return page.locator(`nav[aria-label="${COPY[locale].months}"] a[aria-current="true"]`);
}

function selectedChip(page: Page, locale: Locale): Locator {
  return page.locator(`nav[aria-label="${COPY[locale].kinds}"] a[aria-current="true"]`);
}

async function gridSize(page: Page): Promise<{ width: number; height: number }> {
  return page.locator("ul:has(li[data-reveal-item])").evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error("grid is not an element");
    return { width: element.offsetWidth, height: element.offsetHeight };
  });
}

async function armEnds(cells: Locator): Promise<void> {
  await cells.evaluateAll((elements) => {
    for (const node of elements) {
      if (!(node instanceof HTMLElement)) continue;
      node.dataset.opacityEnds = "0";
      node.addEventListener("transitionend", (event) => {
        if (event.target !== node || event.propertyName !== "opacity") return;
        node.dataset.opacityEnds = String(Number(node.dataset.opacityEnds ?? "0") + 1);
      });
    }
  });
}

async function endCount(cell: Locator): Promise<number> {
  return cell.evaluate((element) => Number((element as HTMLElement).dataset.opacityEnds ?? "0"));
}

async function armMin(cells: Locator): Promise<void> {
  await cells.evaluateAll((elements) => {
    for (const node of elements) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.getAttribute("data-reveal") !== "shown") continue;
      let min = Number(getComputedStyle(node).opacity);
      node.dataset.minShown = String(min);
      const watch = () => {
        const next = Number(getComputedStyle(node).opacity);
        if (next < min) min = next;
        node.dataset.minShown = String(min);
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    }
  });
}

async function minShown(cell: Locator): Promise<number> {
  return cell.evaluate((element) => Number((element as HTMLElement).dataset.minShown ?? "1"));
}

async function revealPending(page: Page): Promise<void> {
  const items = page.locator("[data-reveal-item]");
  const total = await items.count();
  for (let index = 0; index < total; index += 1) {
    const item = items.nth(index);
    if ((await item.getAttribute("data-reveal")) !== "pending") continue;
    await item.evaluate((element) => {
      element.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await expect.poll(async () => item.getAttribute("data-reveal")).toBe("shown");
    await expect.poll(async () => opacityOf(item)).toBe("1");
  }
}

async function openGuide(page: Page, locale: Locale, foreign: string[]): Promise<void> {
  watchRequests(page, foreign);
  const response = await page.goto(`/${locale}/guide?month=8`);
  expect(response?.ok()).toBe(true);
  await afterPaint(page);
}

test.describe("guide reveal", () => {
  test.use({ viewport: PHONE });

  for (const locale of ["en", "ar"] as const) {
    test(`reveals each below-fold card once on /${locale}/guide`, async ({ page }) => {
      const foreign: string[] = [];
      await openGuide(page, locale, foreign);

      const monthMotion = await animationName(monthLabel(page, locale));
      const chipMotion = await animationName(selectedChip(page, locale));
      console.log(`${locale} pill month=${monthMotion} chip=${chipMotion}`);
      expect(monthMotion).toContain("grow");
      expect(chipMotion).toContain("grow");

      const pending = page.locator('li[data-reveal-item][data-reveal="pending"]');
      await expect.poll(async () => pending.count()).toBeGreaterThan(0);
      const pendingBefore = await pending.count();
      const pendingOpacity = await opacityOf(pending.first());
      console.log(`${locale} pending count=${pendingBefore} opacity=${pendingOpacity}`);
      expect(pendingOpacity).toBe("0");

      const cells = page.locator("li[data-reveal-item]");
      const cellCount = await cells.count();
      const pendingIndex: number[] = [];
      for (let index = 0; index < cellCount; index += 1) {
        if ((await cells.nth(index).getAttribute("data-reveal")) === "pending") pendingIndex.push(index);
      }
      expect(pendingIndex.length).toBeGreaterThan(0);

      const before = await gridSize(page);
      await armEnds(cells);
      await revealPending(page);

      const ends: number[] = [];
      for (const index of pendingIndex) {
        const cell = cells.nth(index);
        await expect.poll(async () => endCount(cell)).toBe(1);
        expect(await cell.getAttribute("data-reveal")).toBe("shown");
        expect(await opacityOf(cell)).toBe("1");
        ends.push(await endCount(cell));
      }
      console.log(`${locale} shown ends=${ends.join(",")}`);

      await armMin(cells);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
      const last = cells.last();
      await last.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
      await page.evaluate(() => window.scrollTo(0, 0));
      await last.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));

      const mins: string[] = [];
      for (const index of pendingIndex) {
        const cell = cells.nth(index);
        expect(await cell.getAttribute("data-reveal")).toBe("shown");
        expect(await endCount(cell)).toBe(1);
        const min = await minShown(cell);
        mins.push(min.toFixed(2));
        expect(min).toBeGreaterThanOrEqual(1);
      }
      console.log(`${locale} stayed shown minOpacity=${mins.join(",")}`);

      const after = await gridSize(page);
      console.log(`${locale} grid before=${before.width}x${before.height} after=${after.width}x${after.height}`);
      expect(after).toEqual(before);

      const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      console.log(`${locale} axe=${violations.violations.length}`);
      expect(violations.violations).toEqual([]);

      await page.evaluate(() => {
        history.scrollRestoration = "manual";
        window.scrollTo(0, 0);
      });
      await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
      await page.locator(`nav[aria-label="${COPY[locale].kinds}"]`).getByRole("link", { name: COPY[locale].fruit, exact: true }).evaluate((element) => {
        if (!(element instanceof HTMLElement)) throw new Error("fruit chip is not an element");
        element.click();
      });
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=8&kind=fruit$`));
      await page.evaluate(() => window.scrollTo(0, 0));
      const nextPending = page.locator('li[data-reveal-item][data-reveal="pending"]');
      await expect.poll(async () => nextPending.count()).toBe(0);
      const nextCells = page.locator("li[data-reveal-item]");
      await expect.poll(async () => nextCells.count()).toBeGreaterThan(0);
      const nextCount = await nextCells.count();
      const states: string[] = [];
      const opacities: string[] = [];
      for (let index = 0; index < nextCount; index += 1) {
        const cell = nextCells.nth(index);
        states.push((await cell.getAttribute("data-reveal")) ?? "");
        opacities.push(await opacityOf(cell));
      }
      console.log(
        `${locale} fruit stayed shown count=${nextCount} state=${[...new Set(states)].join(",")} opacity=${[...new Set(opacities)].join(",")}`,
      );
      expect(states.every((state) => state === "shown")).toBe(true);
      expect(opacities.every((value) => value === "1")).toBe(true);
      await expect(page.locator(`a[href="/${locale}/produce/mango"]`)).toBeVisible();
      await expect(page.locator(`a[href="/${locale}/produce/tomato"]`)).toBeHidden();
      expect(await page.locator("li[hidden][data-reveal-item]").count()).toBe(0);
      expect(foreign).toEqual([]);
    });
  }
});

test.describe("guide reveal without javascript", () => {
  test.use({ viewport: PHONE, javaScriptEnabled: false });

  for (const locale of ["en", "ar"] as const) {
    test(`keeps every reveal target at opacity 1 on /${locale}/guide without javascript`, async ({ page }) => {
      const foreign: string[] = [];
      watchRequests(page, foreign);
      const response = await page.goto(`/${locale}/guide?month=8`);
      expect(response?.ok()).toBe(true);
      const targets = page.locator("[data-reveal-item]");
      await expect.poll(async () => targets.count()).toBeGreaterThan(0);
      let opacities: string[] = [];
      await expect.poll(async () => {
        opacities = await targets.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).opacity));
        return opacities.length > 0 && opacities.every((value) => value === "1");
      }).toBe(true);
      console.log(`${locale} nojs count=${opacities.length} opacity=${[...new Set(opacities)].join(",")}`);
      expect(await page.locator("[data-reveal]").count()).toBe(0);
      expect(foreign).toEqual([]);
    });
  }
});

test.describe("guide reveal reduced motion", () => {
  test.use({ viewport: PHONE, reducedMotion: "reduce" });

  for (const locale of ["en", "ar"] as const) {
    test(`marks nothing and drops the pill animation on /${locale}/guide when motion is reduced`, async ({ page }) => {
      const foreign: string[] = [];
      await openGuide(page, locale, foreign);
      await page.locator("[data-reveal-item]").last().evaluate((element) => {
        element.scrollIntoView({ block: "center", inline: "nearest" });
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await afterPaint(page);

      const pending = await page.locator('[data-reveal="pending"]').count();
      const marked = await page.locator("[data-reveal]").count();
      const opacities = await page.locator("[data-reveal-item]").evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).opacity),
      );
      const monthMotion = await animationName(monthLabel(page, locale));
      const chipMotion = await animationName(selectedChip(page, locale));
      console.log(
        `${locale} reduced pending=${pending} marked=${marked} opacity=${[...new Set(opacities)].join(",")} month=${monthMotion} chip=${chipMotion}`,
      );
      expect(pending).toBe(0);
      expect(marked).toBe(0);
      expect(opacities.every((value) => value === "1")).toBe(true);
      expect(monthMotion).toBe("none");
      expect(chipMotion).toBe("none");
      expect(foreign).toEqual([]);
    });
  }
});
