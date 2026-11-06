import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { CalendarMonth } from "../../domain";
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
