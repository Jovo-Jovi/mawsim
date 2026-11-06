import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * A card whose photo is covered, whose frame is not square, or whose circle
 * crosses the ring. Measurements come from the rendered ring tick and the
 * photo circle, not from the geometry module.
 */
type CircleCover = {
  slug: string;
  frameWidth: number;
  frameHeight: number;
  circleWidth: number;
  circleHeight: number;
  cornerRadius: number;
  overflow: string;
  photoRadius: number;
  innerEdgeRadius: number;
  ringInset: number;
  misses: string[];
};

const PAGES = ["/en", "/ar", "/en/guide?month=8", "/ar/guide?month=8"] as const;

const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
] as const;

function coverLine(path: string, width: number, proofs: CircleCover[]): string {
  let largest = proofs[0];
  if (!largest) return `cover ${path} ${width} cards=0`;
  for (const proof of proofs) {
    if (proof.photoRadius > largest.photoRadius) largest = proof;
  }
  const limit = largest.innerEdgeRadius - largest.ringInset;
  return [
    `cover ${path} ${width}`,
    `cards=${proofs.length}`,
    `largestPhotoRadius=${largest.photoRadius.toFixed(2)}`,
    `limit=${limit.toFixed(2)}`,
    `inner=${largest.innerEdgeRadius.toFixed(2)}`,
    `inset=${largest.ringInset.toFixed(2)}`,
    `frame=${largest.frameWidth.toFixed(2)}x${largest.frameHeight.toFixed(2)}`,
    `photoDiameter=${(largest.photoRadius * 2).toFixed(2)}`,
    `slug=${largest.slug}`,
  ].join(" ");
}

async function openProducePage(page: Page, path: string): Promise<Locator> {
  const response = await page.goto(path);
  expect(response?.ok(), path).toBe(true);
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
  });
  const cards = page.locator("main a[href*='/produce/']");
  await expect(cards.first(), path).toBeVisible();
  return cards;
}

async function centerCard(card: Locator): Promise<void> {
  await card.evaluate((anchor) => {
    anchor.scrollIntoView({ block: "center", inline: "center" });
    const circle = anchor.querySelector("[data-photo-circle]");
    const header = document.querySelector("header");
    if (!(circle instanceof HTMLElement) || !(header instanceof HTMLElement)) return;
    const overlap = header.getBoundingClientRect().bottom - circle.getBoundingClientRect().top;
    if (overlap > 0) window.scrollBy(0, -overlap);
  });
  await expect
    .poll(async () => {
      return card.evaluate((anchor) => {
        const circle = anchor.querySelector("[data-photo-circle]");
        if (!(circle instanceof HTMLElement)) return false;
        const box = circle.getBoundingClientRect();
        const header = document.querySelector("header");
        const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;
        const inView =
          box.width > 1 &&
          box.height > 1 &&
          box.top >= headerBottom - 0.5 &&
          box.left >= -0.5 &&
          box.bottom <= window.innerHeight + 0.5 &&
          box.right <= window.innerWidth + 0.5;
        if (!inView) return false;
        let node: Element | null = anchor;
        while (node) {
          const opacity = Number(getComputedStyle(node).opacity);
          if (!Number.isFinite(opacity) || opacity < 0.99) return false;
          if (node.getAttribute("data-reveal") === "pending") return false;
          const running = node
            .getAnimations()
            .some((anim) => anim.playState === "running" || anim.playState === "paused");
          if (running) return false;
          node = node.parentElement;
        }
        return true;
      });
    })
    .toBe(true);
}

async function readCover(card: Locator): Promise<CircleCover> {
  return card.evaluate((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    const slug = /\/produce\/([^/?#]+)/.exec(href)?.[1] ?? "";
    const ring = anchor.querySelector("[data-season-ring]");
    const frame = ring?.parentElement;
    const circle = anchor.querySelector("[data-photo-circle]");
    const svg = ring?.querySelector("svg");
    const tick = svg?.querySelector("line");
    if (!(frame instanceof HTMLElement)) throw new Error(`${slug} has no frame`);
    if (!(circle instanceof HTMLElement)) throw new Error(`${slug} has no photo circle`);
    if (!(svg instanceof SVGSVGElement)) throw new Error(`${slug} has no ring`);
    if (!(tick instanceof SVGLineElement)) throw new Error(`${slug} has no accent tick`);
    const images = [...anchor.querySelectorAll("img")];
    if (images.length !== 1) throw new Error(`${slug} has ${images.length} images`);
    const img = images[0];
    if (!(img instanceof HTMLImageElement)) throw new Error(`${slug} photo is not an image`);

    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.inlineSize = "var(--ring-inset)";
    probe.style.blockSize = "0";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    const ringInset = probe.getBoundingClientRect().width;
    probe.remove();
    if (!(ringInset > 0)) throw new Error(`${slug} ring inset is ${ringInset}`);

    const viewBox = svg.viewBox.baseVal;
    if (!(viewBox.width > 0)) throw new Error(`${slug} ring has no viewBox`);
    const ctm = tick.getScreenCTM();
    if (!ctm) throw new Error(`${slug} ring has no screen transform`);
    const origin = svg.createSVGPoint();
    origin.x = 0;
    origin.y = 0;
    const unit = svg.createSVGPoint();
    unit.x = 1;
    unit.y = 0;
    const originScreen = origin.matrixTransform(ctm);
    const unitScreen = unit.matrixTransform(ctm);
    const scale = Math.hypot(unitScreen.x - originScreen.x, unitScreen.y - originScreen.y);
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    const endA = Math.hypot(tick.x1.baseVal.value - centerX, tick.y1.baseVal.value - centerY);
    const endB = Math.hypot(tick.x2.baseVal.value - centerX, tick.y2.baseVal.value - centerY);
    const innerEdgeRadius = Math.min(endA, endB) * scale;

    const frameBox = frame.getBoundingClientRect();
    const circleBox = circle.getBoundingClientRect();
    const photoRadius = Math.min(circleBox.width, circleBox.height) / 2;
    const style = getComputedStyle(circle);
    const cornerRadius = Number.parseFloat(style.borderTopLeftRadius);
    const centerXpx = circleBox.left + circleBox.width / 2;
    const centerYpx = circleBox.top + circleBox.height / 2;
    const labelOf = (node: Element | null): string => {
      if (!node) return "none";
      const mark = node.getAttribute("data-season-ring") !== null ? "[data-season-ring]" : "";
      const photo = node.getAttribute("data-photo-circle") !== null ? "[data-photo-circle]" : "";
      return `${node.tagName.toLowerCase()}${mark}${photo}`;
    };
    const sample = (name: string, x: number, y: number, misses: string[]): void => {
      const hit = document.elementFromPoint(x, y);
      if (hit !== img) misses.push(`${name} ${labelOf(hit)}`);
    };
    const misses: string[] = [];
    sample("centre", centerXpx, centerYpx, misses);
    for (let step = 0; step < 8; step += 1) {
      const angle = (step * Math.PI) / 4;
      sample(
        String(step),
        centerXpx + Math.cos(angle) * photoRadius * 0.9,
        centerYpx + Math.sin(angle) * photoRadius * 0.9,
        misses,
      );
    }

    return {
      slug,
      frameWidth: frameBox.width,
      frameHeight: frameBox.height,
      circleWidth: circleBox.width,
      circleHeight: circleBox.height,
      cornerRadius,
      overflow: style.overflow,
      photoRadius,
      innerEdgeRadius,
      ringInset,
      misses,
    };
  });
}

for (const viewport of WIDTHS) {
  test.describe(`viewport ${viewport.width}`, () => {
    test.use({ viewport });

    for (const path of PAGES) {
      test(`${path} at ${viewport.width} fails when something is drawn over the produce`, async ({ page }) => {
        const cards = await openProducePage(page, path);
        const count = await cards.count();
        expect(count, path).toBeGreaterThan(0);
        const proofs: CircleCover[] = [];
        for (let index = 0; index < count; index += 1) {
          const card = cards.nth(index);
          await centerCard(card);
          const proof = await readCover(card);
          const where = `${path} ${viewport.width} ${proof.slug}`;
          expect(Math.abs(proof.frameWidth - proof.frameHeight), `${where} frame`).toBeLessThanOrEqual(1);
          expect(Math.abs(proof.circleWidth - proof.circleHeight), `${where} circle`).toBeLessThanOrEqual(1);
          expect(proof.overflow, `${where} clip`).toBe("hidden");
          const side = Math.min(proof.circleWidth, proof.circleHeight);
          expect(proof.cornerRadius + 1, `${where} radius ${proof.cornerRadius} side ${side}`).toBeGreaterThanOrEqual(
            side / 2,
          );
          const limit = proof.innerEdgeRadius - proof.ringInset;
          expect(proof.photoRadius, `${where} photo ${proof.photoRadius} limit ${limit}`).toBeLessThanOrEqual(limit + 1);
          expect(proof.misses, `${where} covered`).toEqual([]);
          if (viewport.width === 390) {
            const frameSide = Math.min(proof.frameWidth, proof.frameHeight);
            expect(proof.photoRadius * 2, `${where} photo diameter against half the frame ${frameSide}`).toBeGreaterThanOrEqual(
              frameSide / 2 - 1,
            );
          }
          proofs.push(proof);
        }
        console.log(coverLine(path, viewport.width, proofs));
      });
    }
  });
}
