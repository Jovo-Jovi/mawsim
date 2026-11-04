import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

type ProduceSlug = { slug: string };

type MeasuredName = {
  slug: string;
  scrollWidth: number;
  clientWidth: number;
  nameX: number;
  nameY: number;
  nameWidth: number;
  nameHeight: number;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
};

type Face = {
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
};

const locales = ["en", "ar"] as const;
const widths = [320, 390, 1280] as const;
const produceRows = JSON.parse(readFileSync("content/produce.json", "utf8")) as ProduceSlug[];

function monthFromGuideHref(href: string): number {
  const match = /[?&]month=(\d+)/.exec(href);
  if (!match?.[1]) throw new Error(`hero guide link has no month: ${href}`);
  const month = Number(match[1]);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`hero guide link month is outside 1..12: ${href}`);
  }
  return month;
}

function faceOf(row: MeasuredName): Face {
  return {
    fontSize: row.fontSize,
    fontWeight: row.fontWeight,
    letterSpacing: row.letterSpacing,
  };
}

async function measureNames(page: Page): Promise<MeasuredName[]> {
  return page.locator('main a[href*="/produce/"] h2').evaluateAll((headings) =>
    headings.map((heading) => {
      if (!(heading instanceof HTMLHeadingElement)) throw new Error("produce name is not an h2");
      const card = heading.closest("a");
      if (!(card instanceof HTMLAnchorElement)) throw new Error("produce name is not inside its card link");
      const nameBox = heading.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      const computed = getComputedStyle(heading);
      const href = card.getAttribute("href") ?? "";
      const slug = /\/produce\/([^/?#]+)/.exec(href)?.[1] ?? "";
      return {
        slug,
        scrollWidth: heading.scrollWidth,
        clientWidth: heading.clientWidth,
        nameX: nameBox.x,
        nameY: nameBox.y,
        nameWidth: nameBox.width,
        nameHeight: nameBox.height,
        cardX: cardBox.x,
        cardY: cardBox.y,
        cardWidth: cardBox.width,
        cardHeight: cardBox.height,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        letterSpacing: computed.letterSpacing,
      };
    }),
  );
}

function assertNameInsideCard(where: string, row: MeasuredName): void {
  expect(row.slug, `${where} slug`).not.toBe("");
  expect(
    row.scrollWidth,
    `${where} ${row.slug} scrollWidth ${row.scrollWidth} clientWidth ${row.clientWidth}`,
  ).toBeLessThanOrEqual(row.clientWidth);
  const tolerance = 1;
  const inside =
    row.nameX >= row.cardX - tolerance &&
    row.nameY >= row.cardY - tolerance &&
    row.nameX + row.nameWidth <= row.cardX + row.cardWidth + tolerance &&
    row.nameY + row.nameHeight <= row.cardY + row.cardHeight + tolerance;
  expect(
    inside,
    `${where} ${row.slug} name ${row.nameWidth}x${row.nameHeight} at ${row.nameX},${row.nameY} card ${row.cardWidth}x${row.cardHeight} at ${row.cardX},${row.cardY}`,
  ).toBe(true);
}

test("a page style that resizes or spills a produce card name", async ({ page }) => {
  test.setTimeout(78 * 15_000);
  const seen: Record<(typeof locales)[number], Set<string>> = { en: new Set(), ar: new Set() };
  const homeMonth: Partial<Record<(typeof locales)[number], number>> = {};
  const homeFaces = new Map<string, Face>();
  const guideFaces = new Map<string, Face>();
  let homeChecked = 0;
  let guideChecked = 0;

  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    for (const locale of locales) {
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      const guideLink = page.locator('main a[href*="/guide?month="]');
      await expect(guideLink).toHaveCount(1);
      const href = await guideLink.getAttribute("href");
      if (href === null) throw new Error(`no hero guide link on /${locale}`);
      const month = monthFromGuideHref(href);
      const earlier = homeMonth[locale];
      if (earlier === undefined) homeMonth[locale] = month;
      else expect(month, `/${locale} hero month`).toBe(earlier);
      await expect(page.locator('main a[href*="/produce/"] h2').first()).toBeVisible();
      const names = await measureNames(page);
      expect(names.length, `/${locale} at ${width}`).toBeGreaterThan(0);
      for (const row of names) {
        assertNameInsideCard(`home /${locale} ${width}px`, row);
        seen[locale].add(row.slug);
        homeFaces.set(`${locale}:${width}:${row.slug}`, faceOf(row));
        homeChecked += 1;
      }
    }

    for (let month = 1; month <= 12; month += 1) {
      for (const locale of locales) {
        await page.goto(`/${locale}/guide?month=${month}`);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('main a[href*="/produce/"] h2').first()).toBeVisible();
        const names = await measureNames(page);
        expect(names.length, `/${locale}/guide?month=${month} at ${width}`).toBeGreaterThan(0);
        for (const row of names) {
          assertNameInsideCard(`guide /${locale}/guide?month=${month} ${width}px`, row);
          seen[locale].add(row.slug);
          if (month === homeMonth[locale]) guideFaces.set(`${locale}:${width}:${row.slug}`, faceOf(row));
          guideChecked += 1;
        }
      }
    }
  }

  for (const [id, home] of homeFaces) {
    const guide = guideFaces.get(id);
    expect(guide, `guide face missing for ${id}`).toBeDefined();
    if (!guide) continue;
    expect(home.fontSize, `${id} font-size home ${home.fontSize} guide ${guide.fontSize}`).toBe(guide.fontSize);
    expect(home.fontWeight, `${id} font-weight home ${home.fontWeight} guide ${guide.fontWeight}`).toBe(
      guide.fontWeight,
    );
    expect(
      home.letterSpacing,
      `${id} letter-spacing home ${home.letterSpacing} guide ${guide.letterSpacing}`,
    ).toBe(guide.letterSpacing);
  }

  for (const locale of locales) {
    for (const row of produceRows) {
      expect(seen[locale].has(row.slug), `${row.slug} measured on /${locale}`).toBe(true);
    }
  }

  console.log(`T09 home-names-checked ${homeChecked}`);
  console.log(`T09 guide-names-checked ${guideChecked}`);
});
