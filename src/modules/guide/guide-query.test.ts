import { expect, it } from "vitest";
import { guideHref, guideQuery, parseGuideView } from "./index";

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

it("writes list into the query, or places view ahead of month or kind", () => {
  expect(guideQuery(null, null, "list")).toBe("");
  expect(guideQuery(8, "fruit", "list")).toBe("?month=8&kind=fruit");
  expect(guideQuery(8, "fruit", "chart")).toBe("?month=8&kind=fruit&view=chart");
  expect(guideQuery(8, null, "chart")).toBe("?month=8&view=chart");
  expect(guideQuery(null, "fruit", "chart")).toBe("?kind=fruit&view=chart");
  expect(guideQuery(null, null, "chart")).toBe("?view=chart");
  expect(guideHref("en", 8, "fruit", "chart")).toBe("/en/guide?month=8&kind=fruit&view=chart");
  expect(guideHref("ar", null, null, "list")).toBe("/ar/guide");
});

it("reads an unknown, empty or repeated view as chart", () => {
  expect(parseGuideView("chart")).toBe("chart");
  expect(parseGuideView("list")).toBe("list");
  expect(parseGuideView("x")).toBe("list");
  expect(parseGuideView("")).toBe("list");
  expect(parseGuideView(["chart", "list"])).toBe("list");
  expect(parseGuideView([])).toBe("list");
  expect(parseGuideView(undefined)).toBe("list");
});
