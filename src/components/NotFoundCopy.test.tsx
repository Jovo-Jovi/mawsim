import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { NotFoundCopy } from "./NotFoundCopy";

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1] ?? "");
}

it("points the guide link at the home page or omits it", () => {
  const arabic = renderToStaticMarkup(<NotFoundCopy locale="ar" />);
  expect(hrefs(arabic)).toEqual(["/ar", "/ar/guide"]);
  expect(arabic).toContain("العودة إلى الصفحة الرئيسية");
  expect(arabic).toContain("افتح الدليل");

  const english = renderToStaticMarkup(<NotFoundCopy locale="en" />);
  expect(hrefs(english)).toEqual(["/en", "/en/guide"]);
  expect(english).toContain("Back to the home page");
  expect(english).toContain("Open the guide");
});
