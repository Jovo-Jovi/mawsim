import { expect, it } from "vitest";
import { getProduceBySlug, seasonRuns } from "./index";

function produceMonths(slug: string) {
  const found = getProduceBySlug(slug);
  if (!found) throw new Error("missing produce");
  return found.months;
}

it("splits July–October into more than one run or drops a month", () => {
  expect(seasonRuns([7, 8, 9, 10])).toEqual([{ from: 7, to: 10 }]);
});

it("breaks the December–April wrap into two runs or reverses its ends", () => {
  expect(seasonRuns([12, 1, 2, 3, 4])).toEqual([{ from: 12, to: 4 }]);
});

it("merges January–February with May into one run", () => {
  expect(seasonRuns([1, 2, 5])).toEqual([
    { from: 1, to: 2 },
    { from: 5, to: 5 },
  ]);
});

it("turns a single month into an empty run or a wider span", () => {
  expect(seasonRuns([3])).toEqual([{ from: 3, to: 3 }]);
});

it("wraps a full calendar into a December-only run", () => {
  expect(seasonRuns([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toEqual([{ from: 1, to: 12 }]);
});

it("follows input order instead of the calendar", () => {
  expect(seasonRuns([10, 8, 7, 9])).toEqual([{ from: 7, to: 10 }]);
});

it("reads mango, orange or tomato as a run the file does not have", () => {
  expect(seasonRuns(produceMonths("mango"))).toEqual([{ from: 7, to: 10 }]);
  expect(seasonRuns(produceMonths("orange"))).toEqual([{ from: 12, to: 4 }]);
  expect(seasonRuns(produceMonths("tomato"))).toEqual([{ from: 1, to: 12 }]);
});
