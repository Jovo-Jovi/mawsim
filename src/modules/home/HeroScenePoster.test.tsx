import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HeroScenePoster } from "./HeroScenePoster";

function poster(): string {
  return renderToStaticMarkup(<HeroScenePoster />);
}

it("drops the decorative svg or leaves it available to assistive technology", () => {
  const html = poster();
  expect(html).toContain("<svg");
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('focusable="false"');
});

it("includes text, a script, or an inline style in the poster", () => {
  const html = poster();
  const styleAttribute = "style" + "=";
  expect(html).not.toContain("<text");
  expect(html).not.toContain("<script");
  expect(html).not.toContain(styleAttribute);
});

it("paints a fill with a raw colour instead of a token", () => {
  const html = poster();
  const fills = [...html.matchAll(/\bfill="([^"]*)"/g)].map((match) => match[1]);
  expect(fills.length).toBeGreaterThan(0);
  for (const fill of fills) expect(fill).toContain("var(");
  expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  expect(html).not.toMatch(/\b(?:rgba?|hsla?)\(/);
});

it("draws fewer than five or more than seven produce", () => {
  const count = [...poster().matchAll(/data-produce="/g)].length;
  expect(count).toBeGreaterThanOrEqual(5);
  expect(count).toBeLessThanOrEqual(7);
});
