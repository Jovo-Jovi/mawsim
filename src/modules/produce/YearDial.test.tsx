import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { CalendarMonth } from "../../domain";
import { ringInnerEdgeRadius, ringOuterEdgeRadius } from "./dial-geometry";
import { YearDial } from "./YearDial";

function markup(selected: CalendarMonth, direction: "ltr" | "rtl", currentMonth: CalendarMonth = 1): string {
  return renderToStaticMarkup(
    <YearDial
      selected={selected}
      currentMonth={currentMonth}
      direction={direction}
      label={(calendarMonth) => <span data-label={calendarMonth}>{calendarMonth}</span>}
    />,
  );
}

function slotStyle(html: string, calendarMonth: CalendarMonth): string {
  const match = new RegExp(
    `style="([^"]*)"[^>]*>\\s*<div\\b[^>]*data-dial-label=""[^>]*>\\s*<span data-label="${calendarMonth}"`,
  ).exec(html);
  return match?.[1] ?? "";
}

it("turns month 1, 4 or 12 away from the geometry", () => {
  expect(markup(1, "ltr")).toContain("--dial-turn:0deg");
  expect(markup(1, "rtl")).toContain("--dial-turn:0deg");
  expect(markup(4, "ltr")).toContain("--dial-turn:-90deg");
  expect(markup(4, "rtl")).toContain("--dial-turn:90deg");
  expect(markup(12, "ltr")).toContain("--dial-turn:-330deg");
  expect(markup(12, "rtl")).toContain("--dial-turn:330deg");
});

it("places a label off its geometry point, or gives the label a direction or a text transform", () => {
  const english = markup(1, "ltr");
  expect(slotStyle(english, 1)).toContain("--dial-x:0.0000cqi");
  expect(slotStyle(english, 1)).toContain("--dial-y:-42.1875cqi");
  expect(slotStyle(english, 4)).toContain("--dial-x:42.1875cqi");
  expect(slotStyle(english, 4)).toContain("--dial-y:0.0000cqi");
  expect(slotStyle(english, 12)).toContain("--dial-x:-21.0938cqi");
  expect(slotStyle(english, 12)).toContain("--dial-y:-36.5354cqi");

  const arabic = markup(1, "rtl");
  expect(slotStyle(arabic, 1)).toContain("--dial-y:-42.1875cqi");
  expect(slotStyle(arabic, 4)).toContain("--dial-x:-42.1875cqi");
  expect(slotStyle(arabic, 4)).toContain("--dial-y:0.0000cqi");
  expect(slotStyle(arabic, 12)).toContain("--dial-x:21.0938cqi");
  expect(slotStyle(arabic, 12)).toContain("--dial-y:-36.5354cqi");

  for (const html of [english, arabic]) {
    expect(html).not.toMatch(/\sdir=/);
    expect(html).not.toMatch(/\slang=/);
    expect(html).not.toContain("text-transform");
  }
});

it("hides a month label inside the ring, or drops this month's accent tick", () => {
  const html = markup(3, "ltr", 8);
  const ring = /<svg\b[\s\S]*?<\/svg>/.exec(html)?.[0] ?? "";
  expect(ring).toContain('aria-hidden="true"');
  expect(ring).toContain('data-dial-ring=""');
  expect(html.match(/<svg\b/g)?.length).toBe(1);
  expect(ring).not.toContain("data-label");
  expect(html.match(/data-label="/g)?.length).toBe(12);
  expect(html.match(/data-dial-turn="/g)?.length).toBe(1);
  expect(html.match(/data-dial-label="/g)?.length).toBe(12);
  expect(html.match(/<line\b/g)?.length).toBe(1);
  expect(html).toContain('x1="8.262"');
  expect(html).toContain('y1="31.738"');
  expect(html).toContain('x2="5.858"');
  expect(html).toContain('y2="34.142"');
});

it("renders a centre or the story size on the guide dial", () => {
  const html = markup(4, "ltr");
  expect(html).toContain('style="--dial-turn:-90deg"');
  expect(html).not.toContain("inline-size");
  expect(html).not.toContain("data-story-centre");
  expect(html.match(/data-dial-turn="/g)?.length).toBe(1);
  expect(html.match(/data-dial-label="/g)?.length).toBe(12);
});

it("puts the centre inside the turning ring", () => {
  const html = renderToStaticMarkup(
    <YearDial
      selected={1}
      currentMonth={1}
      direction="ltr"
      story
      centre={<span data-story-centre="">disc</span>}
      label={(calendarMonth) => <span data-label={calendarMonth}>{calendarMonth}</span>}
    />,
  );
  const centreAt = html.indexOf("data-story-centre");
  const turnAt = html.indexOf('data-dial-turn=""');
  expect(centreAt).toBeGreaterThan(-1);
  expect(turnAt).toBeGreaterThan(centreAt);
  expect(html.slice(turnAt)).not.toContain("data-story-centre");
  expect(html).toContain("--story-band:0.1204");
  expect(html).toContain("--story-band-wide:0.1500");
  expect(html).not.toContain("inline-size:");
  expect(slotStyle(html, 1)).toContain("--dial-x:0.0000cqi");
  expect(slotStyle(html, 1)).toContain("--dial-y:-40.0000cqi");
  expect(html).toContain("--dial-turn:0deg");
});

it("lets the accent tick's round cap paint on the centre photograph", () => {
  const css = readFileSync(new URL("./YearDial.module.css", import.meta.url), "utf8");
  const tickWidth = Number(/\.tick\s*\{[^}]*stroke-width:\s*([0-9.]+)/.exec(css)?.[1]);
  expect(tickWidth).toBeGreaterThan(0);
  const limit = (ringInnerEdgeRadius - tickWidth / 2) / ringOuterEdgeRadius;
  expect(css).toContain("inline-size: 58%");
  expect(css).toContain(
    `calc(58% * (${ringInnerEdgeRadius} - ${tickWidth} / 2) / ${ringOuterEdgeRadius} - 0.25%)`,
  );
  const centreOverRing = limit - 0.0025 / 0.58;
  expect(centreOverRing).toBeLessThan(limit);
  expect(css).toContain("border-radius: var(--radius-pill)");
});
