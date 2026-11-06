import type { CalendarMonth } from "../../domain";

/**
 * Ring geometry in viewBox units (DESIGN_SYSTEM.md §13). Twelve cells of
 * `--dial-step` (30°) begin at 12 o'clock. A gap is centred on each cell
 * boundary, so January's boundary is 12 o'clock and the painted arc is inset
 * by half the gap; cell k therefore ends one gap before cell k+1 starts.
 * The stroke's outer edge meets the viewBox edge.
 */

export const dialViewBoxSize = 40;

/** Widest `stroke-width` in `SeasonRing.module.css`. */
export const ringBandWidth = 3.4;

export const ringOuterEdgeRadius = dialViewBoxSize / 2;

export const ringInnerEdgeRadius = ringOuterEdgeRadius - ringBandWidth;

export const ringStrokeRadius = ringOuterEdgeRadius - ringBandWidth / 2;

/** Radians of empty arc between two painted cells. The previous ring used this gap. */
const RING_CELL_GAP = 0.28;

const CELL_COUNT = 12;

const CELL_SWEEP = (Math.PI * 2) / CELL_COUNT;

const DIAL_STEP_DEGREES = 30;

const CENTER = dialViewBoxSize / 2;

function pointAt(angle: number, radius: number): { x: number; y: number } {
  return {
    x: CENTER + radius * Math.sin(angle),
    y: CENTER - radius * Math.cos(angle),
  };
}

function coordinate(value: number): string {
  return value.toFixed(3);
}

function cellStartAngle(cellIndex: number): number {
  return cellIndex * CELL_SWEEP + RING_CELL_GAP / 2;
}

function cellEndAngle(cellIndex: number): number {
  return (cellIndex + 1) * CELL_SWEEP - RING_CELL_GAP / 2;
}

export function ringCellPath(cellIndex: number): string {
  const from = pointAt(cellStartAngle(cellIndex), ringStrokeRadius);
  const to = pointAt(cellEndAngle(cellIndex), ringStrokeRadius);
  return `M ${coordinate(from.x)} ${coordinate(from.y)} A ${ringStrokeRadius} ${ringStrokeRadius} 0 0 1 ${coordinate(to.x)} ${coordinate(to.y)}`;
}

export function calendarMonthAccentTick(calendarMonth: CalendarMonth): {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
} {
  const midpoint = (calendarMonth - 1) * CELL_SWEEP + CELL_SWEEP / 2;
  const inner = pointAt(midpoint, ringInnerEdgeRadius);
  const outer = pointAt(midpoint, ringOuterEdgeRadius);
  return {
    x1: coordinate(inner.x),
    y1: coordinate(inner.y),
    x2: coordinate(outer.x),
    y2: coordinate(outer.y),
  };
}

export function calendarMonthLabelPoint(
  calendarMonth: CalendarMonth,
  radius: number,
  direction: "ltr" | "rtl",
): { x: number; y: number } {
  const clockwise = (calendarMonth - 1) * CELL_SWEEP;
  const angle = direction === "rtl" ? -clockwise : clockwise;
  return pointAt(angle, radius);
}

export function dialTurnDegrees(calendarMonth: CalendarMonth, direction: "ltr" | "rtl"): number {
  const steps = (calendarMonth - 1) * DIAL_STEP_DEGREES;
  return direction === "rtl" ? steps : 0 - steps;
}

/**
 * Place `index` of `count` on a circle of `radius` (viewBox units).
 * Index 0 sits at 12 o'clock. `rtl` mirrors across the vertical axis, the
 * same rule as `calendarMonthLabelPoint`, so no orbit circle is flipped.
 */
export function orbitPlace(
  index: number,
  count: number,
  radius: number,
  direction: "ltr" | "rtl",
): { x: number; y: number } {
  const clockwise = index * ((Math.PI * 2) / count);
  const angle = direction === "rtl" ? -clockwise : clockwise;
  return pointAt(angle, radius);
}

/**
 * Diameter of one orbit circle, as a share of `--dial-size`, below 64rem.
 * The same share is reserved on each side, so the story dial is `1 − 2b`.
 * 0.12 is the modelled floor, and Chromium floors that used width to 2.3994rem,
 * so the share is 0.1204 and the painted circle stays at least 2.4rem.
 */
export const storyOrbitBandRatio = 0.1204;

/** Diameter of one orbit circle, as a share of `--dial-size`, from 64rem. */
export const storyOrbitBandRatioWide = 0.15;

/**
 * Label-centre radius as a share of the story dial. The guide dial keeps
 * its own radius, 16.875 of the 40-unit viewBox.
 */
export const storyLabelRadiusShare = 0.4;

/**
 * Inset of an orbit circle's centre, as a share of `--dial-size`, so the
 * circle stays inside the story object.
 */
export const storyOrbitCentreInset = 0.006;

/** Centre radius of an orbit circle in the story object's 40-unit system. */
export function storyOrbitCentreRadius(bandRatio: number): number {
  return dialViewBoxSize * ((1 - bandRatio) / 2 - storyOrbitCentreInset);
}

/** Diameter left when `band` is reserved on both sides, so the band stays inside `dialSize`. */
export function innerDialSize(dialSize: number, band: number): number {
  return dialSize - 2 * band;
}
