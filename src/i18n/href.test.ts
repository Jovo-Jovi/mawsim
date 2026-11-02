import { expect, it } from "vitest";
import { localeHref, otherLocale } from "./href";

it("returns the same locale from otherLocale", () => {
  expect(otherLocale("ar")).toBe("en");
  expect(otherLocale("en")).toBe("ar");
});

it("drops the locale prefix or appends a slash for the home path", () => {
  expect(localeHref("ar", "")).toBe("/ar");
  expect(localeHref("en", "")).toBe("/en");
});

it("drops the query or the locale prefix from a path that carries a query", () => {
  expect(localeHref("ar", "/guide?month=3")).toBe("/ar/guide?month=3");
  expect(localeHref("en", "/?kind=leaf")).toBe("/en/?kind=leaf");
});

it("includes the rejected path in the thrown message", () => {
  const rejected = ["not-a-path", "?month=3"];
  const thrown = rejected.map((path) => {
    try {
      localeHref("en", path);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "";
    }
  });
  expect(() => localeHref("ar", rejected[0] ?? "")).toThrow(Error);
  expect(thrown[0]).not.toContain("not-a-path");
  expect(thrown[1]).not.toContain("?month=3");
  expect(thrown[0]).toBe(thrown[1]);
  expect(thrown[0]?.length).toBeGreaterThan(0);
});
