import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { otherLocale } from "@/i18n/href";
import type { Produce } from "./catalogue";
import { getProduceBySlug, getProducePhoto, SeasonArc } from "./index";

function langAttribute(locale: Locale): string {
  return `lang="${locale}"`;
}

function produceOf(slug: string): Produce {
  const found = getProduceBySlug(slug);
  if (!found) throw new Error("missing produce");
  return found;
}

function cells(html: string): string[] {
  return [...html.matchAll(/<li\b[\s\S]*?<\/li>/g)].map((match) => match[0]);
}

function arcLabels(html: string): string[] {
  return [...html.matchAll(/<span\b[^>]*\bdata-arc-label="[^"]*"[^>]*>([^<]*)<\/span>/g)].map(
    (match) => match[1] ?? "",
  );
}

function ringPaths(html: string): string[] {
  return [...html.matchAll(/<path\b[^>]*\bdata-calendar-month="\d+"[^>]*>/g)].map((match) => match[0]);
}

function attr(tag: string, name: string): string {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
}

function drawPlace(tag: string): number | undefined {
  const found = /--arc-draw-place:(\d+)/.exec(attr(tag, "style"));
  return found?.[1] === undefined ? undefined : Number(found[1]);
}

const englishShortLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const arabicShortLabels = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

const mangoEnglish = [
  "January, not in season",
  "February, not in season",
  "March, not in season",
  "April, not in season",
  "May, not in season",
  "June, not in season",
  "July, in season",
  "August, in season",
  "September, in season",
  "October, in season",
  "November, not in season",
  "December, not in season",
] as const;

const mangoArabic = [
  "يناير\u060C خارج الموسم",
  "فبراير\u060C خارج الموسم",
  "مارس\u060C خارج الموسم",
  "أبريل\u060C خارج الموسم",
  "مايو\u060C خارج الموسم",
  "يونيو\u060C خارج الموسم",
  "يوليو\u060C في الموسم",
  "أغسطس\u060C في الموسم",
  "سبتمبر\u060C في الموسم",
  "أكتوبر\u060C في الموسم",
  "نوفمبر\u060C خارج الموسم",
  "ديسمبر\u060C خارج الموسم",
] as const;

it("drops a mango month from the text list, or prints the storage tip beside the sentence", () => {
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("mango")} photo={undefined} locale="en" currentMonth={9} />,
  );
  const items = cells(html);
  expect(items).toHaveLength(12);
  expect(items.map((item) => mangoEnglish.find((state) => item.includes(state)))).toEqual([...mangoEnglish]);
  expect(items.filter((item) => item.includes(", in season"))).toHaveLength(4);
  expect(items[8]).toContain("September, in season");
  expect(html.match(/This month/g)?.length).toBe(1);
  expect(html).toContain("In season: July \u2013 October");
  expect(html).not.toContain("Ripen on the counter, then chill.");
  expect(html).not.toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
  expect(html).not.toContain("dir=");
  expect(html.match(/\blang="[^"]*"/g)).toEqual([langAttribute(otherLocale("en"))]);
});

it("drops an Arabic mango month from the text list, or prints the English storage tip", () => {
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("mango")} photo={undefined} locale="ar" currentMonth={9} />,
  );
  const items = cells(html);
  expect(items).toHaveLength(12);
  expect(items.map((item) => mangoArabic.find((state) => item.includes(state)))).toEqual([...mangoArabic]);
  expect(html.match(/هذا الشهر/g)?.length).toBe(1);
  expect(html).toContain("في الموسم: من يوليو إلى أكتوبر");
  expect(html).not.toContain("Ripen on the counter, then chill.");
  expect(html).not.toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
});

it("reads a wrapped season as January to December", () => {
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("orange")} photo={undefined} locale="en" currentMonth={1} />,
  );
  expect(html).toContain("In season: December \u2013 April");
  expect(html).toContain("December, in season");
  expect(html).toContain("January, in season");
  expect(html).toContain("May, not in season");
  expect(html.match(/This month/g)?.length).toBe(1);
});

it("joins separated months with a range dash", () => {
  const split: Produce = {
    slug: "split-row",
    en: "Split",
    ar: "مقسوم",
    kind: "fruit",
    months: [1, 2, 5],
    tip_en: "Keep this sentence out of the arc.",
    tip_ar: "أبق هذه الجملة خارج القوس.",
  };
  const english = renderToStaticMarkup(<SeasonArc produce={split} photo={undefined} locale="en" currentMonth={2} />);
  const arabic = renderToStaticMarkup(<SeasonArc produce={split} photo={undefined} locale="ar" currentMonth={2} />);
  expect(english).toContain("In season: January \u2013 February, May");
  expect(english).not.toContain("Keep this sentence out of the arc.");
  expect(arabic).toContain("في الموسم: من يناير إلى فبراير\u060C مايو");
  expect(arabic).not.toContain("أبق هذه الجملة خارج القوس.");
});

it("prints a short name at a size other than the text token, or bolds a month that is not this month", () => {
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("mango")} photo={undefined} locale="en" currentMonth={9} />,
  );
  expect(arcLabels(html)).toEqual([...englishShortLabels]);
  const current = html.match(/<span\b([^>]*data-arc-label="current"[^>]*)>([^<]*)</);
  expect(current?.[1]).toContain("--arc-sx:-0.965926");
  expect(html.match(/data-arc-label="current"/g)?.length).toBe(1);
  expect(current?.[2]).toBe("Sep");
  const css = readFileSync(new URL("./SeasonArc.module.css", import.meta.url), "utf8");
  expect(css).toContain("font-size: var(--text-xs)");
  expect(css).not.toMatch(/font-size:\s*(?:calc\(|0\.|1[0-2]px)/);
  expect(css).toMatch(/\.label\s*\{[^}]*font-weight:\s*400/);
  expect(css).toMatch(/data-arc-label="current"\]\s*\{[^}]*font-weight:\s*600/);
  expect(css).toMatch(/data-arc-label="current"\]\s*\{[^}]*var\(--color-accent\)/);
});

it("prints a truncated Arabic month label, or mirrors a label by flipping its letters", () => {
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("mango")} photo={undefined} locale="ar" currentMonth={9} />,
  );
  expect(arcLabels(html)).toEqual([...arabicShortLabels]);
  const current = html.match(/<span\b([^>]*data-arc-label="current"[^>]*)>([^<]*)</);
  expect(current?.[1]).toContain("--arc-sx:0.965926");
  expect(current?.[2]).toBe("سبتمبر");
  const css = readFileSync(new URL("./SeasonArc.module.css", import.meta.url), "utf8");
  expect(css).toContain("scaleX(-1)");
  expect(css).not.toMatch(/\.label[^{]*\{[^}]*scale/);
});

it("prints a single month as a range", () => {
  const alone: Produce = {
    slug: "alone-row",
    en: "Alone",
    ar: "مفرد",
    kind: "leafy",
    months: [6],
    tip_en: "Do not show this tip.",
    tip_ar: "لا تعرض هذه النصيحة.",
  };
  const html = renderToStaticMarkup(<SeasonArc produce={alone} photo={undefined} locale="en" currentMonth={6} />);
  expect(html).toContain("In season: June");
  expect(html).not.toContain("June \u2013");
  expect(html).not.toContain("Do not show this tip.");
});

it("lights a month outside the season, or leaves an in-season month dark", () => {
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("mango")} photo={undefined} locale="en" currentMonth={9} />,
  );
  const paths = ringPaths(html);
  expect(paths).toHaveLength(12);
  expect(paths.filter((path) => attr(path, "data-in") === "true")).toHaveLength(4);
  expect(paths.filter((path) => attr(path, "data-in") === "false")).toHaveLength(8);
  expect(paths.filter((path) => attr(path, "data-in") === "true").map((path) => attr(path, "data-calendar-month"))).toEqual([
    "7",
    "8",
    "9",
    "10",
  ]);
});

it("marks a month other than this month with the accent tick", () => {
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("mango")} photo={undefined} locale="en" currentMonth={9} />,
  );
  const ticks = [...html.matchAll(/<line\b[^>]*>/g)].map((match) => match[0]);
  expect(ticks).toHaveLength(1);
  expect(ticks[0]).toContain("data-arc-tick");
  expect(ticks[0]).toContain('x1="3.966"');
  expect(ticks[0]).toContain('y1="24.296"');
  expect(ticks[0]).toContain('x2="0.681"');
  expect(ticks[0]).toContain('y2="25.176"');
  expect(html).not.toContain('x1="8.262"');
});

it("hides the photograph inside an aria-hidden region, or drops its alt", () => {
  const photo = getProducePhoto("mango");
  if (!photo) throw new Error("missing photograph");
  const html = renderToStaticMarkup(
    <SeasonArc produce={produceOf("mango")} photo={photo} locale="en" currentMonth={9} />,
  );
  const visible = html
    .replace(/<svg\b[^>]*aria-hidden="true"[\s\S]*?<\/svg>/g, "")
    .replace(/<div\b[^>]*aria-hidden="true"[^>]*>(?:(?!<\/div>)[\s\S])*<\/div>/g, "");
  expect(visible).toContain("<img");
  expect(visible).toContain(`alt="${photo.alt_en}"`);
  expect(visible).not.toContain('aria-hidden="true"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('sizes="(min-width: 64rem) 13rem, 10rem"');
});

it("draws orange from January, or a split season as one run", () => {
  const orange = renderToStaticMarkup(
    <SeasonArc produce={produceOf("orange")} photo={undefined} locale="en" currentMonth={1} />,
  );
  const orangePaths = ringPaths(orange);
  const orangeDrawn = orangePaths.filter((path) => attr(path, "data-in") === "true");
  expect(orangeDrawn.map((path) => [attr(path, "data-calendar-month"), drawPlace(path)])).toEqual([
    ["1", 1],
    ["2", 2],
    ["3", 3],
    ["4", 4],
    ["12", 0],
  ]);
  expect(orangeDrawn.every((path) => attr(path, "style").includes("--arc-draw-count:5"))).toBe(true);
  const may = orangePaths.find((path) => attr(path, "data-calendar-month") === "5");
  expect(attr(may ?? "", "data-in")).toBe("false");
  expect(attr(may ?? "", "style")).not.toContain("--arc-draw-place");

  const split: Produce = {
    slug: "split-row",
    en: "Split",
    ar: "مقسوم",
    kind: "fruit",
    months: [1, 2, 5],
    tip_en: "Keep this sentence out of the arc.",
    tip_ar: "أبق هذه الجملة خارج القوس.",
  };
  const splitPaths = ringPaths(
    renderToStaticMarkup(<SeasonArc produce={split} photo={undefined} locale="en" currentMonth={2} />),
  );
  const splitDrawn = splitPaths.filter((path) => attr(path, "data-in") === "true");
  expect(splitDrawn.map((path) => [attr(path, "data-calendar-month"), drawPlace(path)])).toEqual([
    ["1", 0],
    ["2", 1],
    ["5", 2],
  ]);
  expect(splitDrawn.every((path) => attr(path, "style").includes("--arc-draw-count:3"))).toBe(true);
});
