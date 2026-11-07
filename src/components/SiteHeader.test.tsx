import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
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

it("drops the theme group, reorders its buttons, or presses a choice other than the server snapshot", () => {
  for (const locale of ["en", "ar"] as const) {
    const copy = messages(locale).theme;
    const html = renderToStaticMarkup(<SiteHeader locale={locale} path="" />);
    const groups = [...html.matchAll(/<div\b[^>]*role="group"[^>]*>[\s\S]*?<\/div>/g)];
    expect(groups, locale).toHaveLength(1);
    const group = groups[0]?.[0] ?? "";
    expect(group).toContain(`aria-label="${copy.label}"`);
    const buttons = [...group.matchAll(/<button\b([^>]*)>/g)].map((match) => match[1] ?? "");
    expect(buttons).toHaveLength(3);
    expect(buttons.every((tag) => /\btype="button"/.test(tag))).toBe(true);
    expect(buttons.map((tag) => /data-theme-choice="([^"]*)"/.exec(tag)?.[1])).toEqual([
      "system",
      "light",
      "dark",
    ]);
    expect(buttons.map((tag) => /aria-label="([^"]*)"/.exec(tag)?.[1])).toEqual([
      copy.system,
      copy.light,
      copy.dark,
    ]);
    expect(buttons.map((tag) => /aria-pressed="([^"]*)"/.exec(tag)?.[1])).toEqual([
      "true",
      "false",
      "false",
    ]);
  }
});
