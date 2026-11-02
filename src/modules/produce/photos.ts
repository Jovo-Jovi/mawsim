import { existsSync } from "node:fs";
import path from "node:path";
import rawPhotoRows from "../../../content/photos.json";
import { listProduce } from "./catalogue";

export interface ProducePhotoRow {
  readonly key: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly alt_en: string;
  readonly alt_ar: string;
  readonly author: string;
  readonly source_url: string;
  readonly licence: string;
  readonly licence_url: string;
  readonly credit_required: boolean;
}

type PhotoField =
  | "key"
  | "file"
  | "width"
  | "height"
  | "alt_en"
  | "alt_ar"
  | "author"
  | "source_url"
  | "licence"
  | "licence_url"
  | "credit_required";

type TextField = "alt_en" | "alt_ar" | "author" | "licence";

type HttpsField = "source_url" | "licence_url";

function isPlainRow(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readField(row: Record<string, unknown>, field: PhotoField, index: number): unknown {
  if (!Object.hasOwn(row, field)) throw new Error(`photo row ${index}: missing ${field}`);
  return row[field];
}

function readKey(
  row: Record<string, unknown>,
  index: number,
  slugs: readonly string[],
  seen: Set<string>,
): string {
  const value = readField(row, "key", index);
  if (typeof value !== "string") throw new Error(`photo row ${index}: key must be a string`);
  if (value !== "hero" && !slugs.includes(value)) {
    throw new Error(`photo row ${index}: key must be hero or a produce slug`);
  }
  if (seen.has(value)) throw new Error(`photo row ${index}: key must be unique`);
  seen.add(value);
  return value;
}

function readFile(
  row: Record<string, unknown>,
  index: number,
  fileExists: (file: string) => boolean,
): string {
  const value = readField(row, "file", index);
  if (typeof value !== "string") throw new Error(`photo row ${index}: file must be a string`);
  if (!value.startsWith("/photos/")) throw new Error(`photo row ${index}: file must start with /photos/`);
  if (!value.endsWith(".avif") && !value.endsWith(".webp") && !value.endsWith(".jpg")) {
    throw new Error(`photo row ${index}: file must end with .avif, .webp or .jpg`);
  }
  if (value.includes("..")) throw new Error(`photo row ${index}: file must not contain ..`);
  if (!fileExists(value)) throw new Error(`photo row ${index}: file does not exist in public`);
  return value;
}

function readPositiveInteger(row: Record<string, unknown>, field: "width" | "height", index: number): number {
  const value = readField(row, field, index);
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`photo row ${index}: ${field} must be a positive integer`);
  }
  return value;
}

function readWidth(row: Record<string, unknown>, index: number, key: string): number {
  const width = readPositiveInteger(row, "width", index);
  const minimum = key === "hero" ? 1600 : 1200;
  if (width < minimum) throw new Error(`photo row ${index}: width must be at least ${minimum}`);
  return width;
}

function readText(row: Record<string, unknown>, field: TextField, index: number): string {
  const value = readField(row, field, index);
  if (typeof value !== "string") throw new Error(`photo row ${index}: ${field} must be a string`);
  if (value.length === 0) throw new Error(`photo row ${index}: ${field} must be non-empty`);
  return value;
}

function readHttps(row: Record<string, unknown>, field: HttpsField, index: number): string {
  const value = readField(row, field, index);
  if (typeof value !== "string") throw new Error(`photo row ${index}: ${field} must be a string`);
  if (!value.startsWith("https://")) {
    throw new Error(`photo row ${index}: ${field} must begin with https://`);
  }
  return value;
}

function readCreditRequired(row: Record<string, unknown>, index: number): boolean {
  const value = readField(row, "credit_required", index);
  if (typeof value !== "boolean") throw new Error(`photo row ${index}: credit_required must be a boolean`);
  return value;
}

export function parsePhotoRows(
  raw: unknown,
  context: { slugs: readonly string[]; fileExists: (file: string) => boolean },
): readonly ProducePhotoRow[] {
  if (!Array.isArray(raw)) throw new Error("photo rows: not an array");
  const seen = new Set<string>();
  const rows: ProducePhotoRow[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const value = raw[index];
    if (!isPlainRow(value)) throw new Error(`photo row ${index}: not an object`);
    const key = readKey(value, index, context.slugs, seen);
    const file = readFile(value, index, context.fileExists);
    const width = readWidth(value, index, key);
    const height = readPositiveInteger(value, "height", index);
    const altEn = readText(value, "alt_en", index);
    const altAr = readText(value, "alt_ar", index);
    const author = readText(value, "author", index);
    const sourceUrl = readHttps(value, "source_url", index);
    const licence = readText(value, "licence", index);
    const licenceUrl = readHttps(value, "licence_url", index);
    const creditRequired = readCreditRequired(value, index);
    rows.push({
      key,
      file,
      width,
      height,
      alt_en: altEn,
      alt_ar: altAr,
      author,
      source_url: sourceUrl,
      licence,
      licence_url: licenceUrl,
      credit_required: creditRequired,
    });
  }
  return rows;
}

export function photoCreditsInOrder(rows: readonly ProducePhotoRow[]): readonly ProducePhotoRow[] {
  const credits: ProducePhotoRow[] = [];
  for (const row of rows) {
    if (row.credit_required) credits.push(row);
  }
  return credits;
}

function publicFileExists(file: string): boolean {
  return existsSync(path.join(process.cwd(), `public${file}`));
}

const loadedPhotos = parsePhotoRows(rawPhotoRows, {
  slugs: listProduce().map((row) => row.slug),
  fileExists: publicFileExists,
});

export function getProducePhoto(slug: string): ProducePhotoRow | undefined {
  return loadedPhotos.find((row) => row.key === slug);
}

export function getHeroPhoto(): ProducePhotoRow | undefined {
  return loadedPhotos.find((row) => row.key === "hero");
}

export function listPhotoCredits(): readonly ProducePhotoRow[] {
  return photoCreditsInOrder(loadedPhotos);
}
