import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Produce } from "./catalogue";
import { getProduceBySlug, SeasonBar } from "./index";

function produceOf(slug: string): Produce {
  const found = getProduceBySlug(slug);
  if (!found) throw new Error("missing produce");
  return found;
}

function cells(html: string): string[] {
  return [...html.matchAll(/<li\b[\s\S]*?<\/li>/g)].map((match) => match[0]);
}

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

it("drops a mango cell, marks the wrong month, or prints the storage tip in English", () => {
  const html = renderToStaticMarkup(<SeasonBar produce={produceOf("mango")} locale="en" currentMonth={9} />);
  const items = cells(html);
  expect(items).toHaveLength(12);
  expect(items.map((item) => mangoEnglish.find((state) => item.includes(state)))).toEqual([...mangoEnglish]);
  expect(items.filter((item) => item.includes('data-in="true"'))).toHaveLength(4);
  expect(items.filter((item) => item.includes('data-current="true"'))).toEqual([items[8]]);
  expect(items[8]).toContain("September, in season");
  expect(html.match(/data-slot="9"/g)?.length).toBe(1);
  expect(html.match(/This month/g)?.length).toBe(1);
  expect(html).toContain("In season: July \u2013 October");
  expect(html).not.toContain("Ripen on the counter, then chill.");
  expect(html).not.toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
  expect(html).not.toContain('lang="');
  expect(html).not.toContain("dir=");
});

it("drops a mango cell, marks every month, or prints the storage tip in Arabic", () => {
  const html = renderToStaticMarkup(<SeasonBar produce={produceOf("mango")} locale="ar" currentMonth={9} />);
  const items = cells(html);
  expect(items).toHaveLength(12);
  expect(items.map((item) => mangoArabic.find((state) => item.includes(state)))).toEqual([...mangoArabic]);
  expect(items.filter((item) => item.includes('data-current="true"'))).toHaveLength(1);
  expect(html.match(/هذا الشهر/g)?.length).toBe(1);
  expect(html).toContain("في الموسم: من يوليو إلى أكتوبر");
  expect(html).not.toContain("Ripen on the counter, then chill.");
  expect(html).not.toContain("اتركها حتى تنضج ثم ضعها في الثلاجة.");
});

it("reads a wrapped season as January to December", () => {
  const html = renderToStaticMarkup(<SeasonBar produce={produceOf("orange")} locale="en" currentMonth={1} />);
  expect(html).toContain("In season: December \u2013 April");
  expect(html).toContain("December, in season");
  expect(html).toContain("January, in season");
  expect(html).toContain("May, not in season");
  expect(cells(html).filter((item) => item.includes('data-current="true"'))).toHaveLength(1);
});

it("joins separated months with a range dash", () => {
  const split: Produce = {
    slug: "split-row",
    en: "Split",
    ar: "مقسوم",
    kind: "fruit",
    months: [1, 2, 5],
    tip_en: "Keep this sentence out of the bar.",
    tip_ar: "أبق هذه الجملة خارج الشريط.",
  };
  const english = renderToStaticMarkup(<SeasonBar produce={split} locale="en" currentMonth={2} />);
  const arabic = renderToStaticMarkup(<SeasonBar produce={split} locale="ar" currentMonth={2} />);
  expect(english).toContain("In season: January \u2013 February, May");
  expect(english).not.toContain("Keep this sentence out of the bar.");
  expect(arabic).toContain("في الموسم: من يناير إلى فبراير\u060C مايو");
  expect(arabic).not.toContain("أبق هذه الجملة خارج الشريط.");
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
  const html = renderToStaticMarkup(<SeasonBar produce={alone} locale="en" currentMonth={6} />);
  expect(html).toContain("In season: June");
  expect(html).not.toContain("June \u2013");
  expect(html).not.toContain("Do not show this tip.");
});
