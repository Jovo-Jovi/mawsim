import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SeasonDial } from "./SeasonDial";

it("draws fewer or more than twelve arcs, marks another month, drops the count, or exposes the graphic", () => {
  const august = renderToStaticMarkup(<SeasonDial locale="en" currentMonth={8} inSeasonCount={4} />);
  expect(august.match(/data-arc="/g)?.length).toBe(12);
  expect(august.match(/data-current="true"/g)?.length).toBe(1);
  expect(august).toContain('data-arc="8" data-current="true"');
  expect(august).toContain("M 22.163 4.652");
  expect(august).toContain("M 10.453 32.211");
  expect(august).toContain('aria-hidden="true"');
  const hidden = /<div\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/div>/.exec(august)?.[0] ?? "";
  expect(hidden).toContain(">4<");
  expect(hidden).not.toContain("In season this month: 4");
  expect(august).toContain("In season this month: 4");

  const january = renderToStaticMarkup(<SeasonDial locale="ar" currentMonth={1} inSeasonCount={4} />);
  expect(january.match(/data-arc="/g)?.length).toBe(12);
  expect(january.match(/data-current="true"/g)?.length).toBe(1);
  expect(january).toContain('data-arc="1" data-current="true"');
  expect(january).not.toContain('data-arc="8" data-current="true"');
  expect(january).toContain("في موسمه هذا الشهر: 4");

  const css = readFileSync(new URL("./SeasonDial.module.css", import.meta.url), "utf8");
  expect(css).toContain(":dir(rtl)");
  expect(css).toContain("scaleX(-1)");
  expect(css).toContain("var(--color-highlight)");
  expect(css).toContain("var(--color-ink)");
  expect(css).toContain("prefers-color-scheme: dark");
});
