import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
}));

import { cacheLife } from "next/cache";
import { thisCalendarMonth } from "./this-month";

const atUtcMonthBoundary = new Date("2026-01-31T22:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(atUtcMonthBoundary);
  vi.mocked(cacheLife).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

it("returns the UTC month when Cairo has already entered the next month", async () => {
  await expect(thisCalendarMonth()).resolves.toBe(2);
});

it("skips the hours cache profile or asks for it more than once", async () => {
  await thisCalendarMonth();
  expect(cacheLife).toHaveBeenCalledTimes(1);
  expect(cacheLife).toHaveBeenCalledWith("hours");
});
