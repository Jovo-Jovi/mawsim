import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TILT_SINE = Math.sin((1.5 * Math.PI) / 180);
const PHOTO_SCALE = 1.05;
const GLOW_OPACITY = 0.55;

type Reading = {
  transform: string;
  tile: string;
  glowOpacity: string;
  glowTransform: string;
  outlineStyle: string;
  outlineWidth: string;
  frameWidth: number;
  frameHeight: number;
  layoutWidth: number;
  layoutHeight: number;
  haloDx: number;
  haloDy: number;
  haloWidth: number;
  haloHeight: number;
  dialWidth: number;
  dialHeight: number;
};

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

function matrixNumbers(transform: string): number[] {
  const match = /matrix(?:3d)?\(([^)]+)\)/.exec(transform);
  if (!match?.[1]) return [];
  return match[1].split(",").map((part) => Number(part.trim()));
}

function rotationSign(transform: string): number {
  const nums = matrixNumbers(transform);
  if (nums.length !== 16) return 0;
  const sine = nums[8] ?? 0;
  if (Math.abs(Math.abs(sine) - TILT_SINE) > 0.004) return 0;
  return Math.sign(sine);
}

function scalePair(transform: string): { x: number; y: number } | null {
  const nums = matrixNumbers(transform);
  if (nums.length === 6) return { x: nums[0] ?? 0, y: nums[3] ?? 0 };
  if (nums.length === 16) return { x: nums[0] ?? 0, y: nums[5] ?? 0 };
  return null;
}

function tileZoomed(transform: string): boolean {
  const pair = scalePair(transform);
  if (!pair) return false;
  return Math.abs(pair.x - PHOTO_SCALE) < 0.001 && Math.abs(pair.y - PHOTO_SCALE) < 0.001;
}

function glowOn(opacity: string): boolean {
  return Math.abs(Number(opacity) - GLOW_OPACITY) < 0.001;
}

function outlineVisible(style: string, width: string): boolean {
  return style !== "none" && Number.parseFloat(width) >= 2;
}

async function readMotion(card: Locator): Promise<Reading> {
  return card.evaluate((anchor) => {
    const lengthPx = (value: string, size: number): number | null => {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === "auto" || trimmed === "none") return null;
      const n = Number.parseFloat(trimmed);
      if (!Number.isFinite(n)) return null;
      return trimmed.endsWith("%") ? (n / 100) * size : n;
    };
    const photo = anchor.querySelector("img");
    if (!(photo instanceof HTMLElement)) throw new Error("missing photo");
    const frame = photo.parentElement;
    if (!(frame instanceof HTMLElement)) throw new Error("missing frame");
    const ring = anchor.querySelector("[data-season-ring]");
    if (!(ring instanceof HTMLElement)) throw new Error("missing season ring");
    const cardStyle = getComputedStyle(anchor);
    const tileStyle = getComputedStyle(photo);
    const glow = getComputedStyle(ring, "::before");
    let block: HTMLElement | null = ring;
    while (block) {
      const parent = getComputedStyle(block);
      const shifted = parent.transform !== "none" || (parent.translate !== "none" && parent.translate !== "");
      if (parent.position !== "static" || shifted) break;
      block = block.parentElement;
    }
    const host = block ?? document.documentElement;
    const hostStyle = getComputedStyle(host);
    const width = lengthPx(glow.width, host.clientWidth) ?? 0;
    const height = lengthPx(glow.height, host.clientHeight) ?? 0;
    const translate = glow.translate.trim();
    const parts = translate === "" || translate === "none" ? [] : translate.split(/\s+/);
    const shiftX = lengthPx(parts[0] ?? "0", width) ?? 0;
    const shiftY = lengthPx(parts[1] ?? "0", height) ?? 0;
    const left = lengthPx(glow.left, host.clientWidth);
    const right = lengthPx(glow.right, host.clientWidth);
    const top = lengthPx(glow.top, host.clientHeight);
    const bottom = lengthPx(glow.bottom, host.clientHeight);
    const marginLeftRaw = lengthPx(glow.marginLeft, host.clientWidth);
    const marginRightRaw = lengthPx(glow.marginRight, host.clientWidth);
    const marginTopRaw = lengthPx(glow.marginTop, host.clientHeight);
    const marginBottomRaw = lengthPx(glow.marginBottom, host.clientHeight);
    let marginLeft = marginLeftRaw ?? 0;
    let marginRight = marginRightRaw ?? 0;
    let marginTop = marginTopRaw ?? 0;
    let marginBottom = marginBottomRaw ?? 0;
    if (left !== null && right !== null && marginLeftRaw === null && marginRightRaw === null) {
      const spare = (host.clientWidth - left - right - width) / 2;
      marginLeft = spare;
      marginRight = spare;
    }
    if (top !== null && bottom !== null && marginTopRaw === null && marginBottomRaw === null) {
      const spare = (host.clientHeight - top - bottom - height) / 2;
      marginTop = spare;
      marginBottom = spare;
    }
    const paddingX = left !== null ? left + marginLeft + width / 2 : host.clientWidth - (right ?? 0) - marginRight - width / 2;
    const paddingY = top !== null ? top + marginTop + height / 2 : host.clientHeight - (bottom ?? 0) - marginBottom - height / 2;
    const borderLeft = lengthPx(hostStyle.borderLeftWidth, host.clientWidth) ?? 0;
    const borderTop = lengthPx(hostStyle.borderTopWidth, host.clientHeight) ?? 0;
    const fromBorderX = borderLeft + paddingX + shiftX;
    const fromBorderY = borderTop + paddingY + shiftY;
    const hostBox = host.getBoundingClientRect();
    const dialBox = ring.getBoundingClientRect();
    const scaleX = host.offsetWidth === 0 ? 1 : hostBox.width / host.offsetWidth;
    const scaleY = host.offsetHeight === 0 ? 1 : hostBox.height / host.offsetHeight;
    const haloX = hostBox.left + hostBox.width / 2 + (fromBorderX - host.offsetWidth / 2) * scaleX;
    const haloY = hostBox.top + hostBox.height / 2 + (fromBorderY - host.offsetHeight / 2) * scaleY;
    const box = frame.getBoundingClientRect();
    return {
      transform: cardStyle.transform,
      tile: tileStyle.transform,
      glowOpacity: glow.opacity,
      glowTransform: glow.transform,
      outlineStyle: cardStyle.outlineStyle,
      outlineWidth: cardStyle.outlineWidth,
      frameWidth: box.width,
      frameHeight: box.height,
      layoutWidth: frame.offsetWidth,
      layoutHeight: frame.offsetHeight,
      haloDx: haloX - (dialBox.left + dialBox.width / 2),
      haloDy: haloY - (dialBox.top + dialBox.height / 2),
      haloWidth: width,
      haloHeight: height,
      dialWidth: ring.offsetWidth,
      dialHeight: ring.offsetHeight,
    };
  });
}

async function settle(card: Locator): Promise<void> {
  await expect.poll(async () => {
    return card.evaluate((anchor) => {
      let node: Element | null = anchor;
      while (node) {
        if (node.getAnimations().some((anim) => anim.playState === "running")) return false;
        node = node.parentElement;
      }
      return true;
    });
  }).toBe(true);
}

async function pollMotion(card: Locator, ready: (reading: Reading) => boolean): Promise<Reading> {
  let latest: Reading | undefined;
  await expect.poll(async () => {
    const idle = await card.evaluate((anchor) => {
      return anchor.getAnimations({ subtree: true }).every((anim) => anim.playState !== "running");
    });
    latest = await readMotion(card);
    return idle && ready(latest);
  }).toBe(true);
  if (!latest) throw new Error("missing reading");
  return latest;
}

function line(label: string, reading: Reading): string {
  const pair = scalePair(reading.tile);
  const scale = pair ? `${pair.x},${pair.y}` : reading.tile;
  return `${label} transform=${reading.transform} img=${reading.tile} scale=${scale} glow=${reading.glowOpacity} glowTransform=${reading.glowTransform} outline=${reading.outlineStyle}/${reading.outlineWidth} frame=${reading.frameWidth}x${reading.frameHeight} layout=${reading.layoutWidth}x${reading.layoutHeight} haloDx=${reading.haloDx.toFixed(2)} haloDy=${reading.haloDy.toFixed(2)} halo=${reading.haloWidth.toFixed(2)}x${reading.haloHeight.toFixed(2)} ring=${reading.dialWidth}x${reading.dialHeight}`;
}

async function openGuide(page: Page, locale: "en" | "ar", foreign: string[]): Promise<Locator> {
  page.on("request", (request) => rememberForeign(request.url(), foreign));
  page.on("websocket", (socket) => rememberForeign(socket.url(), foreign));
  const response = await page.goto(`/${locale}/guide?month=8`);
  expect(response?.ok()).toBe(true);
  const card = page.locator(`a[href="/${locale}/produce/mango"]`);
  await expect(card).toBeVisible();
  await settle(card);
  return card;
}

async function tabTo(page: Page, href: string): Promise<void> {
  for (let step = 0; step < 80; step += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("href") ?? "");
    if (focused === href) return;
  }
  throw new Error(`Tab never reached ${href}`);
}

for (const locale of ["en", "ar"] as const) {
  const sign = locale === "en" ? 1 : -1;

  test(`hover on /${locale}/guide tilts ${sign > 0 ? "positive" : "negative"}, zooms the tile, and fails when the halo centre leaves the dial by more than 1px`, async ({ page }) => {
    const foreign: string[] = [];
    const card = await openGuide(page, locale, foreign);
    const before = await readMotion(card);
    await card.hover();
    const after = await pollMotion(
      card,
      (reading) => rotationSign(reading.transform) === sign && tileZoomed(reading.tile) && glowOn(reading.glowOpacity),
    );
    console.log(line(`${locale} hover before`, before));
    console.log(line(`${locale} hover after`, after));
    const pair = scalePair(after.tile);
    expect(rotationSign(after.transform)).toBe(sign);
    expect(pair?.x).toBeCloseTo(PHOTO_SCALE, 5);
    expect(pair?.y).toBeCloseTo(PHOTO_SCALE, 5);
    expect(Number(after.glowOpacity)).toBeCloseTo(GLOW_OPACITY, 5);
    expect(after.layoutWidth).toBe(before.layoutWidth);
    expect(after.layoutHeight).toBe(before.layoutHeight);
    expect(after.frameHeight).toBe(before.frameHeight);
    expect(after.frameWidth).toBeCloseTo(before.frameWidth, 0);
    expect(Math.abs(after.frameWidth - before.frameWidth)).toBeLessThan(1);
    expect(Math.abs(after.haloDx)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.haloDy)).toBeLessThanOrEqual(1);
    expect(foreign).toEqual([]);

    const violations = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    console.log(`${locale} hover axe=${violations.violations.length}`);
    expect(violations.violations).toEqual([]);
  });

  test(`Tab focus on /${locale}/guide shows the same tilt, zoom, a 2px outline, and fails when the halo centre leaves the dial by more than 1px`, async ({ page }) => {
    const foreign: string[] = [];
    const href = `/${locale}/produce/mango`;
    await openGuide(page, locale, foreign);
    await tabTo(page, href);
    const card = page.locator(`a[href="${href}"]`);
    const after = await pollMotion(card, (reading) => {
      return rotationSign(reading.transform) === sign && tileZoomed(reading.tile) && glowOn(reading.glowOpacity) && outlineVisible(reading.outlineStyle, reading.outlineWidth);
    });
    console.log(line(`${locale} tab`, after));
    const pair = scalePair(after.tile);
    expect(rotationSign(after.transform)).toBe(sign);
    expect(pair?.x).toBeCloseTo(PHOTO_SCALE, 5);
    expect(pair?.y).toBeCloseTo(PHOTO_SCALE, 5);
    expect(Number(after.glowOpacity)).toBeCloseTo(GLOW_OPACITY, 5);
    expect(after.outlineStyle).not.toBe("none");
    expect(Number.parseFloat(after.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(Math.abs(after.haloDx)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.haloDy)).toBeLessThanOrEqual(1);
    expect(foreign).toEqual([]);
  });
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const locale of ["en", "ar"] as const) {
    test(`hover and Tab on /${locale}/guide leave transform none, halo opacity 0 and the outline`, async ({ page }) => {
      const foreign: string[] = [];
      const href = `/${locale}/produce/mango`;
      const card = await openGuide(page, locale, foreign);
      await card.hover();
      const hovered = await pollMotion(card, (reading) => {
        return reading.transform === "none" && reading.tile === "none" && reading.glowOpacity === "0" && reading.glowTransform === "none";
      });
      console.log(line(`${locale} reduced hover`, hovered));
      expect(hovered.transform).toBe("none");
      expect(hovered.tile).toBe("none");
      expect(hovered.glowOpacity).toBe("0");
      expect(hovered.glowTransform).toBe("none");

      await tabTo(page, href);
      const focused = await pollMotion(card, (reading) => {
        return reading.transform === "none" && reading.tile === "none" && reading.glowOpacity === "0" && reading.glowTransform === "none" && outlineVisible(reading.outlineStyle, reading.outlineWidth);
      });
      console.log(line(`${locale} reduced tab`, focused));
      expect(focused.transform).toBe("none");
      expect(focused.tile).toBe("none");
      expect(focused.glowOpacity).toBe("0");
      expect(focused.glowTransform).toBe("none");
      expect(focused.outlineStyle).not.toBe("none");
      expect(Number.parseFloat(focused.outlineWidth)).toBeGreaterThanOrEqual(2);
      expect(foreign).toEqual([]);
    });
  }
});
