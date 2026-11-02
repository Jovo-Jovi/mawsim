import rawRows from "../../../content/produce.json";
import {
  isCalendarMonth,
  isInSeason,
  produceKinds,
  type CalendarMonth,
  type ProduceKind,
  type SeasonMonths,
} from "../../domain";

export interface Produce {
  readonly slug: string;
  readonly en: string;
  readonly ar: string;
  readonly kind: ProduceKind;
  readonly months: SeasonMonths;
  readonly tip_en: string;
  readonly tip_ar: string;
}

const slugPattern = /^[a-z-]+$/;

function isPlainRow(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readField(row: Record<string, unknown>, field: keyof Produce, index: number): unknown {
  if (!Object.hasOwn(row, field)) throw new Error(`produce row ${index}: missing ${field}`);
  return row[field];
}

function readText(row: Record<string, unknown>, field: "en" | "ar" | "tip_en" | "tip_ar", index: number): string {
  const value = readField(row, field, index);
  if (typeof value !== "string") throw new Error(`produce row ${index}: ${field} must be a string`);
  if (value.length === 0) throw new Error(`produce row ${index}: ${field} must be non-empty`);
  return value;
}

function readSlug(row: Record<string, unknown>, index: number, seen: Set<string>): string {
  const value = readField(row, "slug", index);
  if (typeof value !== "string") throw new Error(`produce row ${index}: slug must be a string`);
  if (!slugPattern.test(value)) {
    throw new Error(`produce row ${index}: slug must be lowercase a-z and hyphens`);
  }
  if (seen.has(value)) throw new Error(`produce row ${index}: slug must be unique`);
  seen.add(value);
  return value;
}

function readKind(row: Record<string, unknown>, index: number): ProduceKind {
  const value = readField(row, "kind", index);
  if (typeof value !== "string") throw new Error(`produce row ${index}: kind must be a string`);
  for (const kind of produceKinds) {
    if (value === kind) return kind;
  }
  throw new Error(`produce row ${index}: kind must be fruit, vegetable or leafy`);
}

function readMonths(row: Record<string, unknown>, index: number): SeasonMonths {
  const value = readField(row, "months", index);
  if (!Array.isArray(value)) throw new Error(`produce row ${index}: months must be an array`);
  const months: CalendarMonth[] = [];
  for (const item of value) {
    if (!isCalendarMonth(item) || months.includes(item)) {
      throw new Error(`produce row ${index}: months must be unique integers 1-12`);
    }
    months.push(item);
  }
  if (months.length === 0) throw new Error(`produce row ${index}: months must be unique integers 1-12`);
  return months;
}

export function parseProduceRows(raw: unknown): readonly Produce[] {
  if (!Array.isArray(raw)) throw new Error("produce rows: not an array");
  const seen = new Set<string>();
  const rows: Produce[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const value = raw[index];
    if (!isPlainRow(value)) throw new Error(`produce row ${index}: not an object`);
    const slug = readSlug(value, index, seen);
    const en = readText(value, "en", index);
    const ar = readText(value, "ar", index);
    const kind = readKind(value, index);
    const months = readMonths(value, index);
    const tipEn = readText(value, "tip_en", index);
    const tipAr = readText(value, "tip_ar", index);
    rows.push({ slug, en, ar, kind, months, tip_en: tipEn, tip_ar: tipAr });
  }
  return rows;
}

const catalogue = parseProduceRows(rawRows);

export function listProduce(): readonly Produce[] {
  return catalogue;
}

export function getProduceBySlug(slug: string): Produce | undefined {
  return catalogue.find((row) => row.slug === slug);
}

export function inSeasonIn(month: CalendarMonth): readonly Produce[] {
  return catalogue.filter((row) => isInSeason(row.months, month));
}
