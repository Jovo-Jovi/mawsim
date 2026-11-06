import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SeasonRing } from "./SeasonRing";

it("omits the accent tick or draws it on the wrong arc", () => {
  const plain = renderToStaticMarkup(<SeasonRing kind="fruit" months={[7, 8, 9, 10]} />);
  expect(plain).not.toContain("<line");
  expect(plain.match(/data-in="/g)?.length).toBe(12);
  const marked = renderToStaticMarkup(<SeasonRing kind="fruit" months={[7, 8, 9, 10]} currentMonth={8} />);
  expect(marked.match(/<line\b/g)?.length).toBe(1);
  expect(marked).toContain('x1="8.262"');
  expect(marked).toContain('y1="31.738"');
  expect(marked).toContain('x2="5.858"');
  expect(marked).toContain('y2="34.142"');
  expect(marked.match(/data-in="/g)?.length).toBe(12);
  const january = renderToStaticMarkup(<SeasonRing kind="fruit" months={[7, 8, 9, 10]} currentMonth={1} />);
  expect(january).toContain('x1="24.296"');
  expect(january).toContain('y1="3.966"');
  expect(january).not.toContain('x1="8.262"');
});

it("mirrors the ring the wrong way, or paints the tick in a colour other than the accent", () => {
  const ringCss = readFileSync(new URL("./SeasonRing.module.css", import.meta.url), "utf8");
  expect(ringCss).toContain(":dir(rtl)");
  expect(ringCss).toContain("scaleX(-1)");
  expect(ringCss).toContain("var(--color-accent)");
});
