import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  calendarMonthAccentTick,
  calendarMonthLabelPoint,
  dialTurnDegrees,
  dialViewBoxSize,
  innerDialSize,
  orbitPlace,
  ringBandWidth,
  ringCellPath,
  ringInnerEdgeRadius,
  ringOuterEdgeRadius,
  ringStrokeRadius,
  storyOrbitBandRatio,
} from "./dial-geometry";

const CENTER = 20;
const CELL_SWEEP = Math.PI / 6;
const RING_CELL_GAP = 0.28;

function parseCellPath(path: string): {
  start: { x: number; y: number };
  end: { x: number; y: number };
  radius: number;
} {
  const match = /^M ([0-9.]+) ([0-9.]+) A ([0-9.]+) \3 0 0 1 ([0-9.]+) ([0-9.]+)$/.exec(path);
  if (!match) throw new Error(path);
  return {
    start: { x: Number(match[1]), y: Number(match[2]) },
    radius: Number(match[3]),
    end: { x: Number(match[4]), y: Number(match[5]) },
  };
}

function angleOf(point: { x: number; y: number }): number {
  const angle = Math.atan2(point.x - CENTER, CENTER - point.y);
  return angle < 0 ? angle + Math.PI * 2 : angle;
}

it("draws fewer than twelve cells, a cell other than thirty degrees, or starts January away from 12 o'clock", () => {
  const cells = Array.from({ length: 12 }, (_, cellIndex) => parseCellPath(ringCellPath(cellIndex)));
  expect(cells).toHaveLength(12);
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    if (!cell) throw new Error("missing cell");
    expect(cell.radius).toBe(18.3);
    const start = angleOf(cell.start);
    const end = angleOf(cell.end);
    expect(start).toBeCloseTo(cellIndex * CELL_SWEEP + RING_CELL_GAP / 2, 4);
    let painted = end - start;
    if (painted < 0) painted += Math.PI * 2;
    expect(painted).toBeCloseTo(CELL_SWEEP - RING_CELL_GAP, 4);
    const nextStart =
      cellIndex < 11 ? angleOf(cells[cellIndex + 1]!.start) : angleOf(cells[0]!.start) + Math.PI * 2;
    expect(end).toBeCloseTo(nextStart - RING_CELL_GAP, 4);
  }
  const january = cells[0];
  if (!january) throw new Error("missing January");
  expect(angleOf(january.start) - RING_CELL_GAP / 2).toBeCloseTo(0, 4);
  expect(january.start.x).toBeCloseTo(22.554, 3);
  expect(january.start.y).toBeCloseTo(1.879, 3);
});

it("places the accent tick off the month midpoint or outside the band", () => {
  expect(calendarMonthAccentTick(8)).toEqual({
    x1: "8.262",
    y1: "31.738",
    x2: "5.858",
    y2: "34.142",
  });
  expect(calendarMonthAccentTick(1)).toEqual({
    x1: "24.296",
    y1: "3.966",
    x2: "25.176",
    y2: "0.681",
  });
  const august = calendarMonthAccentTick(8);
  const innerRadius = Math.hypot(Number(august.x1) - CENTER, Number(august.y1) - CENTER);
  const outerRadius = Math.hypot(Number(august.x2) - CENTER, Number(august.y2) - CENTER);
  expect(innerRadius).toBeCloseTo(16.6, 3);
  expect(outerRadius).toBeCloseTo(20, 3);
  expect(innerRadius).toBeGreaterThanOrEqual(ringInnerEdgeRadius - 0.001);
  expect(outerRadius).toBeLessThanOrEqual(ringOuterEdgeRadius + 0.001);
  expect(angleOf({ x: Number(august.x1), y: Number(august.y1) })).toBeCloseTo(7.5 * CELL_SWEEP, 4);
});

it("places an rtl label off the mirror of its ltr point", () => {
  const radius = 10;
  for (const calendarMonth of [1, 2, 4, 7, 12] as const) {
    const ltr = calendarMonthLabelPoint(calendarMonth, radius, "ltr");
    const rtl = calendarMonthLabelPoint(calendarMonth, radius, "rtl");
    expect(rtl.x).toBeCloseTo(dialViewBoxSize - ltr.x, 5);
    expect(rtl.y).toBeCloseTo(ltr.y, 5);
  }
  expect(calendarMonthLabelPoint(1, radius, "ltr")).toEqual({ x: 20, y: 10 });
  expect(calendarMonthLabelPoint(1, radius, "rtl")).toEqual({ x: 20, y: 10 });
  const aprilLtr = calendarMonthLabelPoint(4, radius, "ltr");
  const aprilRtl = calendarMonthLabelPoint(4, radius, "rtl");
  expect(aprilLtr.x).toBeCloseTo(30, 5);
  expect(aprilLtr.y).toBeCloseTo(20, 5);
  expect(aprilRtl.x).toBeCloseTo(10, 5);
  expect(aprilRtl.y).toBeCloseTo(20, 5);
});

it("turns months 1, 4 and 12 the wrong way", () => {
  expect(dialTurnDegrees(1, "ltr")).toBe(0);
  expect(dialTurnDegrees(1, "rtl")).toBe(0);
  expect(dialTurnDegrees(4, "ltr")).toBe(-90);
  expect(dialTurnDegrees(4, "rtl")).toBe(90);
  expect(dialTurnDegrees(12, "ltr")).toBe(-330);
  expect(dialTurnDegrees(12, "rtl")).toBe(330);
});

it("sets the ring outer edge inside half the viewBox", () => {
  expect(dialViewBoxSize).toBe(40);
  expect(ringOuterEdgeRadius).toBe(20);
  expect(ringBandWidth).toBe(3.4);
  expect(ringInnerEdgeRadius).toBe(16.6);
  expect(ringStrokeRadius).toBe(18.3);
  expect(ringOuterEdgeRadius * 2).toBe(dialViewBoxSize);
});

it("puts an orbit place off 12 o'clock, or leaves the rtl place unmirrored", () => {
  const radius = 10;
  const count = 10;
  for (const direction of ["ltr", "rtl"] as const) {
    const first = orbitPlace(0, count, radius, direction);
    expect(first.x).toBeCloseTo(CENTER, 5);
    expect(first.y).toBeCloseTo(CENTER - radius, 5);
  }
  for (let index = 0; index < count; index += 1) {
    const ltr = orbitPlace(index, count, radius, "ltr");
    const rtl = orbitPlace(index, count, radius, "rtl");
    expect(rtl.x).toBeCloseTo(dialViewBoxSize - ltr.x, 5);
    expect(rtl.y).toBeCloseTo(ltr.y, 5);
  }
  const east = orbitPlace(1, 4, radius, "ltr");
  expect(east.x).toBeCloseTo(30, 5);
  expect(east.y).toBeCloseTo(20, 5);
  const west = orbitPlace(1, 4, radius, "rtl");
  expect(west.x).toBeCloseTo(10, 5);
  expect(west.y).toBeCloseTo(20, 5);
});

it("returns an inner dial that swallows the orbit band or grows past the outer size", () => {
  expect(20 * storyOrbitBandRatio).toBe(1);
  expect(innerDialSize(20, 1)).toBe(18);
  expect(innerDialSize(20, 20 * storyOrbitBandRatio)).toBe(18);
  expect(innerDialSize(28, 28 * storyOrbitBandRatio)).toBe(25.2);
  expect(innerDialSize(34, 34 * storyOrbitBandRatio)).toBe(30.6);
  expect(innerDialSize(100, 100 * storyOrbitBandRatio)).toBe(90);
  const dialSize = 20;
  const band = 1;
  expect(innerDialSize(dialSize, band)).toBeLessThan(dialSize);
  expect(innerDialSize(dialSize, band) + 2 * band).toBe(dialSize);
});

it("lets the band width drift from the widest stroke in the ring stylesheet", () => {
  const css = readFileSync(new URL("./SeasonRing.module.css", import.meta.url), "utf8");
  const widths = [...css.matchAll(/stroke-width:\s*([0-9.]+)/g)].map((match) => Number(match[1]));
  expect(widths).toEqual([3.4, 2.2, 3.4, 2.2, 1.6]);
  expect(Math.max(...widths)).toBe(ringBandWidth);
});
