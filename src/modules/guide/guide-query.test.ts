import { expect, it } from "vitest";
import { guideHref, guideQuery } from "./index";

it("drops a parsed part, leads with kind, or emits a bare question mark", () => {
  expect(guideQuery(null, null)).toBe("");
  expect(guideQuery(8, null)).toBe("?month=8");
  expect(guideQuery(null, "fruit")).toBe("?kind=fruit");
  expect(guideQuery(8, "fruit")).toBe("?month=8&kind=fruit");
  expect(guideQuery(1, "leafy")).toBe("?month=1&kind=leafy");
});

it("builds a guide href that drops the locale or the parsed query", () => {
  expect(guideHref("ar", 8, "fruit")).toBe("/ar/guide?month=8&kind=fruit");
  expect(guideHref("en", null, null)).toBe("/en/guide");
  expect(guideHref("en", 8, null)).toBe("/en/guide?month=8");
});
