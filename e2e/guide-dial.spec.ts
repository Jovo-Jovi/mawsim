import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const COPY = {
  en: {
    months: "Months",
    kinds: "Kinds",
    previous: "Previous month",
    next: "Next month",
    chart: "Seasons across the year",
    language: "العربية",
    other: "ar",
  },
  ar: {
    months: "الشهور",
    kinds: "الأنواع",
    previous: "الشهر السابق",
    next: "الشهر التالي",
    chart: "المواسم على مدار السنة",
    language: "English",
    other: "en",
  },
} as const;

type Locale = keyof typeof COPY;

type Box = {
  month: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layoutWidth: number;
  layoutHeight: number;
};

function overlapArea(a: Box, b: Box): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

async function monthBoxes(page: Page, locale: Locale): Promise<Box[]> {
  return page.locator(`nav[aria-label="${COPY[locale].months}"] a[data-month]`).evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      const link = element as HTMLElement;
      return {
        month: element.getAttribute("data-month") ?? "",
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        layoutWidth: link.offsetWidth,
        layoutHeight: link.offsetHeight,
      };
    }),
  );
}

for (const locale of ["en", "ar"] as const) {
  for (const viewport of [
    { name: "1280", width: 1280, height: 900 },
    { name: "390", width: 390, height: 844 },
  ] as const) {
    test(`${locale} dial targets stay clear at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`/${locale}/guide?month=8`);
      expect(response?.ok()).toBe(true);

      const months = page.locator(`nav[aria-label="${COPY[locale].months}"]`);
      await expect(months.locator("a[data-month]")).toHaveCount(12);
      const selected = months.locator('a[aria-current="true"]');
      await expect(selected).toHaveAttribute("data-month", "8");
      await expect.poll(() => selected.evaluate((element) => getComputedStyle(element).transform)).toBe("none");

      const boxes = await monthBoxes(page, locale);
      const steps = {
        previous: await months.getByRole("link", { name: COPY[locale].previous, exact: true }).boundingBox(),
        next: await months.getByRole("link", { name: COPY[locale].next, exact: true }).boundingBox(),
      };
      const dial = await months.boundingBox();
      const ringSvg = months.locator("svg[data-dial-ring]");
      await expect(ringSvg).toHaveCount(1);
      const ring = await ringSvg.boundingBox();
      const selectedBox = await selected.boundingBox();
      if (dial === null || ring === null || selectedBox === null || steps.previous === null || steps.next === null) {
        throw new Error("dial geometry missing");
      }

      const sizes = boxes
        .map(
          (box) =>
            `${box.month}:${box.width.toFixed(4)}x${box.height.toFixed(4)} layout=${box.layoutWidth}x${box.layoutHeight}`,
        )
        .join(" ");
      const overlaps = boxes.flatMap((box, index) =>
        boxes.slice(index + 1).flatMap((other) => {
          const area = overlapArea(box, other);
          return area > 0 ? [`${box.month}/${other.month}:${area.toFixed(2)}`] : [];
        }),
      );
      const selectedDx = selectedBox.x + selectedBox.width / 2 - (ring.x + ring.width / 2);
      console.log(
        `${locale} ${viewport.name} dial=${dial.width.toFixed(2)}x${dial.height.toFixed(2)} selectedDx=${selectedDx.toFixed(2)} prev=${steps.previous.width.toFixed(2)}x${steps.previous.height.toFixed(2)} next=${steps.next.width.toFixed(2)}x${steps.next.height.toFixed(2)} months=${sizes} overlaps=${overlaps.join(",") || "none"}`,
      );

      // The link's layout size is 2.75rem (44px). Chromium's getBoundingClientRect
      // of the counter-rotated box undershoots that by less than 0.001px, so the
      // painted size is compared at a hundredth of a pixel.
      for (const box of boxes) {
        expect(box.layoutWidth).toBeGreaterThanOrEqual(44);
        expect(box.layoutHeight).toBeGreaterThanOrEqual(44);
        expect(Number(box.width.toFixed(2))).toBeGreaterThanOrEqual(44);
        expect(Number(box.height.toFixed(2))).toBeGreaterThanOrEqual(44);
      }
      expect(steps.previous.width).toBeGreaterThanOrEqual(44);
      expect(steps.previous.height).toBeGreaterThanOrEqual(44);
      expect(steps.next.width).toBeGreaterThanOrEqual(44);
      expect(steps.next.height).toBeGreaterThanOrEqual(44);
      expect(overlaps).toEqual([]);
      expect(Math.abs(selectedDx)).toBeLessThanOrEqual(2);
      expect(selectedBox.y + selectedBox.height / 2).toBeLessThan(ring.y + ring.height / 2);

      const heading = await page.locator("h1").boundingBox();
      const chips = await page.locator(`nav[aria-label="${COPY[locale].kinds}"]`).boundingBox();
      if (heading === null || chips === null) throw new Error("guide header missing");
      if (viewport.width === 390) {
        expect(dial.y).toBeGreaterThan(heading.y + heading.height - 1);
        expect(chips.y).toBeGreaterThan(dial.y + dial.height - 1);
      } else {
        const beside =
          dial.y < heading.y + heading.height &&
          heading.y < dial.y + dial.height &&
          (dial.x >= heading.x + heading.width || heading.x >= dial.x + dial.width);
        expect(beside).toBe(true);
      }

      const scroll = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      console.log(`${locale} ${viewport.name} scroll=${scroll.scrollWidth}/${scroll.clientWidth}`);
      expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);

      const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations.violations).toEqual([]);

      await months.locator('a[data-month="9"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=9$`));

      await page.goto(`/${locale}/guide?month=8&kind=fruit`);
      const kept = months.locator('a[data-month="9"]');
      await expect(kept).toHaveAttribute("href", `/${locale}/guide?month=9&kind=fruit`);
      await kept.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/guide\\?month=9&kind=fruit$`));
    });

    test(`${locale} chart keeps kind and view and fits at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`/${locale}/guide?month=8&kind=fruit&view=chart`);
      expect(response?.ok()).toBe(true);

      const months = page.locator(`nav[aria-label="${COPY[locale].months}"]`);
      await expect(months.locator('a[data-month="9"]')).toHaveAttribute(
        "href",
        `/${locale}/guide?month=9&kind=fruit&view=chart`,
      );
      const chart = page.getByRole("list", { name: COPY[locale].chart });
      await expect(chart).toBeVisible();
      const scroll = await page.evaluate(() => {
        const node = document.querySelector("[data-year-chart]");
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          chartScrollWidth: node?.scrollWidth ?? -1,
          chartClientWidth: node?.clientWidth ?? -1,
        };
      });
      console.log(
        `${locale} ${viewport.name} chart scroll=${scroll.scrollWidth}/${scroll.clientWidth} chartBox=${scroll.chartScrollWidth}/${scroll.chartClientWidth}`,
      );
      expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
      expect(scroll.chartScrollWidth).toBeLessThanOrEqual(scroll.chartClientWidth);

      if (viewport.name === "390") {
        const headerLines = await page.locator("[data-chart-head] [data-month]").evaluateAll((elements) =>
          elements.map((element) => {
            const style = getComputedStyle(element);
            const range = document.createRange();
            range.selectNodeContents(element);
            const rects = [...range.getClientRects()];
            const probe = document.createElement("span");
            probe.textContent = element.textContent;
            probe.style.font = style.font;
            probe.style.whiteSpace = "nowrap";
            probe.style.position = "absolute";
            probe.style.visibility = "hidden";
            document.body.appendChild(probe);
            const needed = probe.getBoundingClientRect().width;
            probe.remove();
            const lineHeight = Number.parseFloat(style.lineHeight);
            const paddingBlock = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
            const chartBox = element.closest("[data-year-chart]")?.getBoundingClientRect();
            const line = rects[0];
            return {
              month: element.getAttribute("data-month") ?? "",
              text: element.textContent ?? "",
              lines: rects.length,
              lineWidth: line?.width ?? 0,
              needed,
              boxHeight: element.getBoundingClientRect().height,
              lineBox: lineHeight + paddingBlock,
              lineLeft: line && chartBox ? line.left - chartBox.left : 0,
              lineRight: line && chartBox ? line.right - chartBox.left : 0,
              lineTop: line?.top ?? 0,
              chartWidth: chartBox?.width ?? 0,
            };
          }),
        );
        console.log(
          `${locale} 390 header ${headerLines
            .map(
              (line) =>
                `${line.month}:${line.text} lines=${line.lines} width=${line.lineWidth.toFixed(1)}/${line.needed.toFixed(1)} height=${line.boxHeight.toFixed(1)}/${line.lineBox.toFixed(1)}`,
            )
            .join(" ")}`,
        );
        expect(headerLines).toHaveLength(12);
        for (const line of headerLines) {
          expect(line.lines).toBe(1);
          expect(Math.abs(line.lineWidth - line.needed)).toBeLessThan(1);
          expect(Math.abs(line.boxHeight - line.lineBox)).toBeLessThan(1);
          expect(line.lineLeft).toBeGreaterThanOrEqual(-1);
          expect(line.lineRight).toBeLessThanOrEqual(line.chartWidth + 1);
        }
        const bands: (typeof headerLines)[] = [];
        for (const line of [...headerLines].sort((a, b) => a.lineTop - b.lineTop)) {
          const band = bands.find((group) => {
            const first = group[0];
            return first !== undefined && Math.abs(first.lineTop - line.lineTop) < 4;
          });
          if (band === undefined) bands.push([line]);
          else band.push(line);
        }
        expect(bands).toHaveLength(2);
        for (const group of bands) {
          const ordered = [...group].sort((a, b) => a.lineLeft - b.lineLeft);
          for (let index = 1; index < ordered.length; index += 1) {
            const previous = ordered[index - 1];
            const current = ordered[index];
            if (previous === undefined || current === undefined) continue;
            expect(current.lineLeft).toBeGreaterThanOrEqual(previous.lineRight - 1);
          }
        }
      }

      const column = await page.locator("[data-year-chart]").evaluate((chart) => {
        const head = chart.querySelector("[data-chart-head] [data-selected='true']");
        const cell = chart.querySelector("ol [data-selected='true']");
        if (head === null || cell === null) return null;
        const headBox = head.getBoundingClientRect();
        const cellBox = cell.getBoundingClientRect();
        const tops = [...chart.querySelectorAll("[data-chart-head] [data-month]")].map(
          (node) => node.getBoundingClientRect().top,
        );
        return {
          dx: headBox.left - cellBox.left,
          dw: headBox.width - cellBox.width,
          rowSpread: Math.max(...tops) - Math.min(...tops),
        };
      });
      if (column === null) throw new Error("selected chart column missing");
      console.log(
        `${locale} ${viewport.name} header column dx=${column.dx.toFixed(2)} dw=${column.dw.toFixed(2)} rowSpread=${column.rowSpread.toFixed(1)}`,
      );
      expect(Math.abs(column.dx)).toBeLessThan(1);
      expect(Math.abs(column.dw)).toBeLessThan(1);
      if (viewport.name === "390") expect(column.rowSpread).toBeGreaterThan(8);
      expect(column.rowSpread).toBeLessThan(viewport.name === "1280" ? 2 : 80);

      const language = page.getByRole("banner").getByRole("link", { name: COPY[locale].language, exact: true });
      await expect(language).toHaveAttribute(
        "href",
        `/${COPY[locale].other}/guide?month=8&kind=fruit&view=chart`,
      );

      const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(violations.violations).toEqual([]);
    });
  }
}
