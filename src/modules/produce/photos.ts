import { existsSync } from "node:fs";
import path from "node:path";
import rawPhotoRows from "../../../content/photos.json";
import { listProduce } from "./catalogue";

interface PhotoRowCommon {
  readonly key: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly alt_en: string;
  readonly alt_ar: string;
  readonly credit_required: boolean;
}

export interface GeneratedPhotoRow extends PhotoRowCommon {
  readonly source: "generated";
  readonly model: string;
  readonly prompt: string;
  readonly generated_on: string;
  readonly terms_url: string;
}

export interface LicensedPhotoRow extends PhotoRowCommon {
  readonly source: "licensed";
  readonly author: string;
  readonly source_url: string;
  readonly licence: string;
  readonly licence_url: string;
}

export interface OwnPhotoRow extends PhotoRowCommon {
  readonly source: "own";
  readonly author: string;
}

export type PhotoSource = "generated" | "licensed" | "own";

export type ProducePhotoRow = GeneratedPhotoRow | LicensedPhotoRow | OwnPhotoRow;

type PhotoField =
  | "key"
  | "file"
  | "width"
  | "height"
  | "alt_en"
  | "alt_ar"
  | "source"
  | "credit_required"
  | "model"
  | "prompt"
  | "generated_on"
  | "terms_url"
  | "author"
  | "source_url"
  | "licence"
  | "licence_url";

type TextField = "alt_en" | "alt_ar" | "author" | "licence" | "model" | "prompt";

type HttpsField = "source_url" | "licence_url" | "terms_url";

const FILE_SUFFIXES = [".avif", ".webp", ".jpg", ".png"] as const;

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
  if (value !== "hero" && value !== "texture" && !slugs.includes(value)) {
    throw new Error(`photo row ${index}: key must be hero, texture or a produce slug`);
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
  if (!FILE_SUFFIXES.some((suffix) => value.endsWith(suffix))) {
    throw new Error(`photo row ${index}: file must end with .avif, .webp, .jpg or .png`);
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

function minimumWidth(key: string): number {
  if (key === "hero") return 1600;
  if (key === "texture") return 1024;
  return 1200;
}

function readWidth(row: Record<string, unknown>, index: number, key: string): number {
  const width = readPositiveInteger(row, "width", index);
  const minimum = minimumWidth(key);
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

function readSource(row: Record<string, unknown>, index: number): PhotoSource {
  const value = readField(row, "source", index);
  if (typeof value !== "string") throw new Error(`photo row ${index}: source must be a string`);
  if (value !== "generated" && value !== "licensed" && value !== "own") {
    throw new Error(`photo row ${index}: source must be generated, licensed or own`);
  }
  return value;
}

function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function readGeneratedOn(row: Record<string, unknown>, index: number): string {
  const value = readField(row, "generated_on", index);
  if (typeof value !== "string") throw new Error(`photo row ${index}: generated_on must be a string`);
  if (!isRealCalendarDate(value)) {
    throw new Error(`photo row ${index}: generated_on must be a date YYYY-MM-DD`);
  }
  return value;
}

function readCreditRequired(row: Record<string, unknown>, index: number): boolean {
  const value = readField(row, "credit_required", index);
  if (typeof value !== "boolean") throw new Error(`photo row ${index}: credit_required must be a boolean`);
  return value;
}

function parseOne(row: Record<string, unknown>, index: number, key: string, file: string): ProducePhotoRow {
  const common = {
    key,
    file,
    width: readWidth(row, index, key),
    height: readPositiveInteger(row, "height", index),
    alt_en: readText(row, "alt_en", index),
    alt_ar: readText(row, "alt_ar", index),
    credit_required: readCreditRequired(row, index),
  };
  const source = readSource(row, index);
  if (source === "generated") {
    return {
      ...common,
      source,
      model: readText(row, "model", index),
      prompt: readText(row, "prompt", index),
      generated_on: readGeneratedOn(row, index),
      terms_url: readHttps(row, "terms_url", index),
    };
  }
  if (source === "licensed") {
    return {
      ...common,
      source,
      author: readText(row, "author", index),
      source_url: readHttps(row, "source_url", index),
      licence: readText(row, "licence", index),
      licence_url: readHttps(row, "licence_url", index),
    };
  }
  return {
    ...common,
    source,
    author: readText(row, "author", index),
  };
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
    rows.push(parseOne(value, index, key, file));
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

export function getTexturePhoto(): ProducePhotoRow | undefined {
  return loadedPhotos.find((row) => row.key === "texture");
}

export function listPhotoCredits(): readonly ProducePhotoRow[] {
  return photoCreditsInOrder(loadedPhotos);
}
