import { expect, it } from "vitest";
import { dialTurnDegrees } from "@/modules/produce";
import { dialTurnOffset } from "./index";

const halfTurn = Math.abs(dialTurnDegrees(7, "ltr"));

it("takes the long way from December to January, or keeps one sign in both directions", () => {
  expect(dialTurnOffset(12, 1, "ltr", dialTurnDegrees)).toBe(30);
  expect(dialTurnOffset(12, 1, "rtl", dialTurnDegrees)).toBe(-30);
  expect(dialTurnOffset(1, 12, "ltr", dialTurnDegrees)).toBe(-30);
  expect(dialTurnOffset(1, 12, "rtl", dialTurnDegrees)).toBe(30);
  expect(dialTurnOffset(12, 1, "ltr", dialTurnDegrees)).toBe(-dialTurnOffset(12, 1, "rtl", dialTurnDegrees));
  expect(dialTurnOffset(1, 12, "ltr", dialTurnDegrees)).toBe(-dialTurnOffset(1, 12, "rtl", dialTurnDegrees));
});

it("steps past a half turn from month 1, 4 or 8, or lands outside (−180, 180]", () => {
  const cases: { previous: 1 | 4 | 8 | 12; next: 1 | 9 | 12; ltr: number; rtl: number }[] = [
    { previous: 1, next: 9, ltr: -120, rtl: 120 },
    { previous: 4, next: 9, ltr: 150, rtl: -150 },
    { previous: 8, next: 9, ltr: 30, rtl: -30 },
    { previous: 12, next: 1, ltr: 30, rtl: -30 },
    { previous: 1, next: 12, ltr: -30, rtl: 30 },
  ];
  for (const step of cases) {
    const ltr = dialTurnOffset(step.previous, step.next, "ltr", dialTurnDegrees);
    const rtl = dialTurnOffset(step.previous, step.next, "rtl", dialTurnDegrees);
    expect(ltr, `${step.previous}→${step.next} ltr`).toBe(step.ltr);
    expect(rtl, `${step.previous}→${step.next} rtl`).toBe(step.rtl);
    expect(ltr).toBeGreaterThan(-halfTurn);
    expect(ltr).toBeLessThanOrEqual(halfTurn);
    expect(rtl).toBeGreaterThan(-halfTurn);
    expect(rtl).toBeLessThanOrEqual(halfTurn);
    expect(ltr).toBe(-rtl);
  }
});
