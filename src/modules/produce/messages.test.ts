import { expect, it } from "vitest";
import { messages } from "@/i18n/messages";

const monthNames = [
  ["1", "January", "يناير", "Jan", "ينا"],
  ["2", "February", "فبراير", "Feb", "فبر"],
  ["3", "March", "مارس", "Mar", "مار"],
  ["4", "April", "أبريل", "Apr", "أبر"],
  ["5", "May", "مايو", "May", "ماي"],
  ["6", "June", "يونيو", "Jun", "يون"],
  ["7", "July", "يوليو", "Jul", "يول"],
  ["8", "August", "أغسطس", "Aug", "أغس"],
  ["9", "September", "سبتمبر", "Sep", "سبت"],
  ["10", "October", "أكتوبر", "Oct", "أكت"],
  ["11", "November", "نوفمبر", "Nov", "نوف"],
  ["12", "December", "ديسمبر", "Dec", "ديس"],
] as const;

const catalogueKeys = [
  "app.name",
  "app.tagline",
  "error.retry",
  "error.title",
  "footer.collectsNothing",
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
  "nav.home",
  "nav.label",
  "notFound.body",
  "notFound.home",
  "notFound.title",
  "notice.sample",
  "produce.inSeason",
  "produce.keepIt",
  "produce.monthInSeason",
  "produce.monthOutOfSeason",
  "produce.seasonList",
  "produce.seasonRange",
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
  });
  expect(messages("ar").produce).toEqual({
    keepIt: "كيف تحفظه",
    inSeason: "في الموسم:",
    thisMonth: "هذا الشهر",
    monthInSeason: "في الموسم",
    monthOutOfSeason: "خارج الموسم",
    seasonRange: "من {from} إلى {to}",
    seasonList: "{earlier}\u060C {later}",
  });
});

it("adds a key the fence does not name, or loses one", () => {
  expect(flatKeys(messages("en")).sort()).toEqual([...catalogueKeys]);
  expect(flatKeys(messages("ar")).sort()).toEqual([...catalogueKeys]);
  expect(catalogueKeys).toHaveLength(47);
});
