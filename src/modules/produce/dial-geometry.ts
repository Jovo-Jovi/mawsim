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
