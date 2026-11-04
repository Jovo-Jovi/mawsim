import { expect, it } from "vitest";
import { messages } from "@/i18n/messages";

const monthNames = [
  ["1", "January", "يناير", "Jan", "يناير"],
  ["2", "February", "فبراير", "Feb", "فبراير"],
  ["3", "March", "مارس", "Mar", "مارس"],
  ["4", "April", "أبريل", "Apr", "أبريل"],
  ["5", "May", "مايو", "May", "مايو"],
  ["6", "June", "يونيو", "Jun", "يونيو"],
  ["7", "July", "يوليو", "Jul", "يوليو"],
  ["8", "August", "أغسطس", "Aug", "أغسطس"],
  ["9", "September", "سبتمبر", "Sep", "سبتمبر"],
  ["10", "October", "أكتوبر", "Oct", "أكتوبر"],
  ["11", "November", "نوفمبر", "Nov", "نوفمبر"],
  ["12", "December", "ديسمبر", "Dec", "ديسمبر"],
] as const;

const catalogueKeys = [
  "app.name",
  "app.tagline",
  "app.titleJoin",
  "error.retry",
  "error.title",
  "footer.collectsNothing",
  "guide.all",
  "guide.empty",
  "guide.kinds",
  "guide.months",
  "guide.showAll",
  "guide.showThisMonth",
  "guide.thisMonth",
  "guide.title",
  "home.dialCount",
  "home.guideLink",
  "home.headline",
  "home.inSeason",
  "kind.fruit",
  "kind.leafy",
  "kind.vegetable",
  "language.switch",
  "months.1",
  "months.10",
  "months.11",
  "months.12",
  "months.2",
  "months.3",
  "months.4",
  "months.5",
  "months.6",
  "months.7",
  "months.8",
  "months.9",
  "monthsShort.1",
  "monthsShort.10",
  "monthsShort.11",
  "monthsShort.12",
  "monthsShort.2",
  "monthsShort.3",
  "monthsShort.4",
  "monthsShort.5",
  "monthsShort.6",
  "monthsShort.7",
  "monthsShort.8",
  "monthsShort.9",
  "nav.guide",
  "nav.home",
  "nav.label",
  "notFound.body",
  "notFound.guide",
  "notFound.home",
  "notFound.title",
  "notice.sample",
  "produce.inSeason",
  "produce.keepIt",
  "produce.monthInSeason",
  "produce.monthOutOfSeason",
  "produce.seasonList",
  "produce.seasonRange",
  "produce.stateJoin",
  "produce.thisMonth",
  "skip.content",
] as const;

function flatKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.keys(value).flatMap((key) => {
    const child = (value as Record<string, unknown>)[key];
    const next = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object") return flatKeys(child, next);
    return [next];
  });
}

it("drops a month name, a short name, or gives the two catalogues different text", () => {
  const en = messages("en");
  const ar = messages("ar");
  for (const [key, enName, arName, enShort, arShort] of monthNames) {
    expect(en.months[key]).toBe(enName);
    expect(ar.months[key]).toBe(arName);
    expect(en.monthsShort[key]).toBe(enShort);
    expect(ar.monthsShort[key]).toBe(arShort);
  }
});

it("drops a kind label or leaves it empty", () => {
  expect(messages("en").kind).toEqual({ fruit: "Fruit", vegetable: "Vegetables", leafy: "Leafy greens" });
  expect(messages("ar").kind).toEqual({ fruit: "فاكهة", vegetable: "خضار", leafy: "ورقيات" });
});

it("drops a produce-page string or copies the English into Arabic", () => {
  expect(messages("en").produce).toEqual({
    keepIt: "How to keep it",
    inSeason: "In season:",
    thisMonth: "This month",
    monthInSeason: "in season",
    monthOutOfSeason: "not in season",
    seasonRange: "{from} \u2013 {to}",
    seasonList: "{earlier}, {later}",
    stateJoin: ", ",
  });
  expect(messages("ar").produce).toEqual({
    keepIt: "طريقة الحفظ",
    inSeason: "في الموسم:",
    thisMonth: "هذا الشهر",
    monthInSeason: "في الموسم",
    monthOutOfSeason: "خارج الموسم",
    seasonRange: "من {from} إلى {to}",
    seasonList: "{earlier}\u060C {later}",
    stateJoin: "\u060C ",
  });
});

it("adds a key the fence does not name, or loses one", () => {
  expect(flatKeys(messages("en")).sort()).toEqual([...catalogueKeys]);
  expect(flatKeys(messages("ar")).sort()).toEqual([...catalogueKeys]);
  expect(catalogueKeys).toHaveLength(63);
});
