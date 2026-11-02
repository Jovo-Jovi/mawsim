import { expect, it } from "vitest";
import { getProduceBySlug, inSeasonIn, listProduce, parseProduceRows } from "./catalogue";

const validRow = {
  slug: "fig",
  en: "Fig",
  ar: "تين",
  kind: "fruit",
  months: [6, 7],
  tip_en: "Keep cool.",
  tip_ar: "احفظها باردة.",
};

function thrownMessage(raw: unknown): string {
  try {
    parseProduceRows(raw);
  } catch (error) {
    if (error instanceof Error) return error.message;
  }
  return "";
}

it("drops, reorders or invents a produce row", () => {
  expect(listProduce()).toHaveLength(10);
  expect(listProduce().map((row) => row.slug)).toEqual([
    "tomato",
    "mango",
    "orange",
    "strawberry",
    "watermelon",
    "guava",
    "pomegranate",
    "okra",
    "molokhia",
    "dates",
  ]);
});

it("returns another produce row for an exact slug or accepts a slug that is not exact", () => {
  expect(getProduceBySlug("mango")).toEqual({
    slug: "mango",
    en: "Mango",
    ar: "مانجو",
    kind: "fruit",
    months: [7, 8, 9, 10],
    tip_en: "Ripen on the counter, then chill.",
    tip_ar: "اتركها حتى تنضج ثم ضعها في الثلاجة.",
  });
  expect(getProduceBySlug("orange")?.months).toEqual([12, 1, 2, 3, 4]);
  expect(getProduceBySlug("Mango")).toBeUndefined();
  expect(getProduceBySlug("")).toBeUndefined();
  expect(getProduceBySlug("unknown")).toBeUndefined();
  expect(getProduceBySlug("../mango")).toBeUndefined();
  expect(getProduceBySlug(" mango")).toBeUndefined();
});

it("omits an in-season row or includes an out-of-season row", () => {
  expect(inSeasonIn(8).map((row) => row.slug)).toEqual([
    "tomato",
    "mango",
    "watermelon",
    "guava",
    "okra",
    "molokhia",
    "dates",
  ]);
  expect(inSeasonIn(1).map((row) => row.slug)).toEqual(["tomato", "orange", "strawberry"]);
});

it("copies an extra key onto a parsed row", () => {
  expect(parseProduceRows([{ ...validRow, note: "extra" }])).toEqual([validRow]);
});

it("accepts produce rows that are not an array", () => {
  expect(thrownMessage(validRow)).toBe("produce rows: not an array");
});

it("accepts a null produce row", () => {
  expect(thrownMessage([validRow, null])).toBe("produce row 1: not an object");
});

it("accepts a produce row that omits a field", () => {
  const missingEn = {
    slug: "lime",
    ar: "تين",
    kind: "fruit",
    months: [6, 7],
    tip_en: "Keep cool.",
    tip_ar: "احفظها باردة.",
  };
  expect(thrownMessage([validRow, missingEn])).toBe("produce row 1: missing en");
});

it("accepts a produce name that is not a string", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", en: 4 }])).toBe(
    "produce row 1: en must be a string",
  );
});

it("accepts months that are not an array", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", months: "6" }])).toBe(
    "produce row 1: months must be an array",
  );
});

it("accepts a repeated slug", () => {
  expect(thrownMessage([validRow, { ...validRow }])).toBe("produce row 1: slug must be unique");
});

it("accepts a slug with an upper-case letter", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "Fig" }])).toBe(
    "produce row 1: slug must be lowercase a-z and hyphens",
  );
});

it("accepts a slug with a digit", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "fig2" }])).toBe(
    "produce row 1: slug must be lowercase a-z and hyphens",
  );
});

it("accepts a slug with a space", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "fig " }])).toBe(
    "produce row 1: slug must be lowercase a-z and hyphens",
  );
});

it("accepts an empty English name", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", en: "" }])).toBe(
    "produce row 1: en must be non-empty",
  );
});

it("accepts an empty Arabic name", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", ar: "" }])).toBe(
    "produce row 1: ar must be non-empty",
  );
});

it("accepts a kind outside fruit, vegetable and leafy", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", kind: "grain" }])).toBe(
    "produce row 1: kind must be fruit, vegetable or leafy",
  );
});

it("accepts a produce row with no months", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", months: [] }])).toBe(
    "produce row 1: months must be unique integers 1-12",
  );
});

it("accepts a month number of 0", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", months: [0] }])).toBe(
    "produce row 1: months must be unique integers 1-12",
  );
});

it("accepts a month number of 13", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", months: [13] }])).toBe(
    "produce row 1: months must be unique integers 1-12",
  );
});

it("accepts a fractional month", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", months: [1.5] }])).toBe(
    "produce row 1: months must be unique integers 1-12",
  );
});

it("accepts a repeated month", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", months: [6, 6] }])).toBe(
    "produce row 1: months must be unique integers 1-12",
  );
});

it("accepts an empty English storage tip", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", tip_en: "" }])).toBe(
    "produce row 1: tip_en must be non-empty",
  );
});

it("accepts an empty Arabic storage tip", () => {
  expect(thrownMessage([validRow, { ...validRow, slug: "lime", tip_ar: "" }])).toBe(
    "produce row 1: tip_ar must be non-empty",
  );
});
