import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { SiteHeader } from "./SiteHeader";

function navAnchors(html: string): { href: string; text: string; current: string | null }[] {
  const nav = /<nav\b[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? "";
  return [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const tag = match[1] ?? "";
    return {
      href: /href="([^"]*)"/.exec(tag)?.[1] ?? "",
      text: (match[2] ?? "").replace(/<[^>]+>/g, ""),
      current: /aria-current="([^"]*)"/.exec(tag)?.[1] ?? null,
    };
  });
}

function header(locale: Locale, path: string): { href: string; text: string; current: string | null }[] {
  return navAnchors(renderToStaticMarkup(<SiteHeader locale={locale} path={path} />));
}

it("reorders Home, Guide and About, or marks a header link current on the wrong page", () => {
  const englishAbout = header("en", "/about");
  expect(englishAbout.map((anchor) => anchor.text)).toEqual(["Home", "Guide", "About"]);
  expect(englishAbout.map((anchor) => anchor.href)).toEqual(["/en", "/en/guide", "/en/about"]);
  expect(englishAbout.map((anchor) => anchor.current)).toEqual([null, null, "page"]);

  const englishGuide = header("en", "/guide");
  expect(englishGuide.map((anchor) => anchor.text)).toEqual(["Home", "Guide", "About"]);
  expect(englishGuide.map((anchor) => anchor.href)).toEqual(["/en", "/en/guide", "/en/about"]);
  expect(englishGuide.map((anchor) => anchor.current)).toEqual([null, "page", null]);

  const arabicAbout = header("ar", "/about");
  expect(arabicAbout.map((anchor) => anchor.text)).toEqual(["الرئيسية", "الدليل", "عن الموقع"]);
  expect(arabicAbout.map((anchor) => anchor.href)).toEqual(["/ar", "/ar/guide", "/ar/about"]);
  expect(arabicAbout.map((anchor) => anchor.current)).toEqual([null, null, "page"]);

  const arabicGuide = header("ar", "/guide");
  expect(arabicGuide.map((anchor) => anchor.text)).toEqual(["الرئيسية", "الدليل", "عن الموقع"]);
  expect(arabicGuide.map((anchor) => anchor.href)).toEqual(["/ar", "/ar/guide", "/ar/about"]);
  expect(arabicGuide.map((anchor) => anchor.current)).toEqual([null, "page", null]);
});
