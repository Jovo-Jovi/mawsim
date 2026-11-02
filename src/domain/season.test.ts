import { expect, it } from "vitest";
import {
  cairoMonth,
  filterByKind,
  isInSeason,
  parseKindParam,
  parseMonthParam,
  type ProduceKind,
  type SeasonMonths,
} from "./season";

it("treats a season that wraps past December as out of season in May", () => {
  const orangeMonths: SeasonMonths = [12, 1, 2, 3, 4];
  expect(isInSeason(orangeMonths, 12)).toBe(true);
  expect(isInSeason(orangeMonths, 1)).toBe(true);
  expect(isInSeason(orangeMonths, 5)).toBe(false);
});

it("reads the UTC month instead of the Africa/Cairo month", () => {
  expect(cairoMonth(new Date("2026-01-31T21:59:59Z"))).toBe(1);
  expect(cairoMonth(new Date("2026-01-31T22:00:00Z"))).toBe(2);
  expect(cairoMonth(new Date("2026-12-31T21:59:59Z"))).toBe(12);
  expect(cairoMonth(new Date("2026-12-31T22:30:00Z"))).toBe(1);
  expect(cairoMonth(new Date("2026-08-15T12:00:00Z"))).toBe(8);
});

it("accepts a month query that is not an exact ASCII numeral from 1 to 12", () => {
  const accepted = [
    ["1", 1],
    ["8", 8],
    ["12", 12],
  ] as const;
  for (const [input, want] of accepted) {
    expect(parseMonthParam(input, 3)).toBe(want);
  }
  const rejected: Array<string | string[] | undefined> = [
    undefined,
    "",
    "0",
    "13",
    "08",
    " 8",
    "8 ",
    "+8",
    "1.5",
    "8abc",
    "١٢",
    ["1", "2"],
  ];
  for (const input of rejected) {
    expect(parseMonthParam(input, 3)).toBe(3);
  }
});

it("accepts a kind query that is not an exact produce kind", () => {
  expect(parseKindParam("fruit")).toBe("fruit");
  expect(parseKindParam("vegetable")).toBe("vegetable");
  expect(parseKindParam("leafy")).toBe("leafy");
  const rejected: Array<string | string[] | undefined> = ["Fruit", "fruits", "", undefined, ["fruit"]];
  for (const input of rejected) {
    expect(parseKindParam(input)).toBeNull();
  }
});

it("reorders rows or drops a row when the kind is null", () => {
  const rows: { kind: ProduceKind; name: string }[] = [
    { kind: "vegetable", name: "tomato" },
    { kind: "fruit", name: "mango" },
    { kind: "leafy", name: "molokhia" },
    { kind: "fruit", name: "orange" },
  ];
  expect(filterByKind(rows, "fruit")).toEqual([
    { kind: "fruit", name: "mango" },
    { kind: "fruit", name: "orange" },
  ]);
  expect(filterByKind(rows, null)).toEqual([
    { kind: "vegetable", name: "tomato" },
    { kind: "fruit", name: "mango" },
    { kind: "leafy", name: "molokhia" },
    { kind: "fruit", name: "orange" },
  ]);
});
