import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { SiteFooter } from "./SiteFooter";

function anchors(html: string): { href: string; text: string; current: string | null }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const tag = match[1] ?? "";
    return {
      href: /href="([^"]*)"/.exec(tag)?.[1] ?? "",
      text: (match[2] ?? "").replace(/<[^>]+>/g, ""),
      current: /aria-current="([^"]*)"/.exec(tag)?.[1] ?? null,
    };
  });
}

function footer(locale: Locale, path: string): { href: string; text: string; current: string | null }[] {
  return anchors(renderToStaticMarkup(<SiteFooter locale={locale} path={path} />));
}

it("points the footer About link at another page, or marks it current off the about page", () => {
  const englishAbout = footer("en", "/about");
  expect(englishAbout.filter((anchor) => anchor.text === "About")).toEqual([
    { href: "/en/about", text: "About", current: "page" },
  ]);
  expect(englishAbout.filter((anchor) => anchor.current === "page").map((anchor) => anchor.href)).toEqual([
    "/en/about",
  ]);

  const englishGuide = footer("en", "/guide");
  expect(englishGuide.filter((anchor) => anchor.text === "About")).toEqual([
    { href: "/en/about", text: "About", current: null },
  ]);
  expect(englishGuide.filter((anchor) => anchor.current === "page")).toEqual([]);

  const arabicAbout = footer("ar", "/about");
  expect(arabicAbout.filter((anchor) => anchor.text === "عن الموقع")).toEqual([
    { href: "/ar/about", text: "عن الموقع", current: "page" },
  ]);
  expect(arabicAbout.filter((anchor) => anchor.current === "page").map((anchor) => anchor.href)).toEqual([
    "/ar/about",
  ]);

  const arabicGuide = footer("ar", "/guide");
  expect(arabicGuide.filter((anchor) => anchor.text === "عن الموقع")).toEqual([
    { href: "/ar/about", text: "عن الموقع", current: null },
  ]);
  expect(arabicGuide.filter((anchor) => anchor.current === "page")).toEqual([]);
});
