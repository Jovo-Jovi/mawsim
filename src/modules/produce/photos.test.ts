import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, expect, it } from "vitest";
import { listProduce } from "./catalogue";
import {
  getHeroPhoto,
  getProducePhoto,
  listPhotoCredits,
  parsePhotoRows,
  photoCreditsInOrder,
} from "./photos";

const tempRoot = mkdtempSync(path.join(tmpdir(), "mawsim-photos-"));
const publicRoot = path.join(tempRoot, "public");
const heroFile = "/photos/hero/stall.avif";
const mangoFile = "/photos/produce/mango.jpg";
const datesFile = "/photos/produce/dates.webp";
const okraFile = "/photos/produce/okra.avif";

function writePhoto(file: string): void {
  const full = path.join(publicRoot, file.slice(1));
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, "");
}

writePhoto(heroFile);
writePhoto(mangoFile);
writePhoto(datesFile);
writePhoto(okraFile);

afterAll(() => {
  rmSync(tempRoot, { recursive: true, force: true });
});

function fileExists(file: string): boolean {
  return existsSync(path.join(publicRoot, file.slice(1)));
}

function realFileExists(file: string): boolean {
  return existsSync(path.join(process.cwd(), `public${file}`));
}

const slugs = listProduce().map((row) => row.slug);
const context = { slugs, fileExists };

function photoRow(overrides: Record<string, unknown> = {}) {
  return {
    key: "hero",
    file: heroFile,
    width: 1600,
    height: 1200,
    alt_en: "Market stall",
    alt_ar: "كشك السوق",
    author: "Huda N.",
    source_url: "https://localhost/source",
    licence: "Commercial use",
    licence_url: "https://localhost/licence",
    credit_required: true,
    ...overrides,
  };
}

function thrownMessage(raw: unknown): string {
  try {
    parsePhotoRows(raw, context);
  } catch (error) {
    if (error instanceof Error) return error.message;
  }
  return "";
}

it("drops a row from the real photo manifest or invents one", () => {
  const raw: unknown = JSON.parse(readFileSync(path.join(process.cwd(), "content/photos.json"), "utf8"));
  if (!Array.isArray(raw)) throw new Error("photos manifest is not an array");
  const rows = parsePhotoRows(raw, {
    slugs,
    fileExists: realFileExists,
  });
  expect(rows).toHaveLength(raw.length);
  expect(getHeroPhoto()).toEqual(rows.find((row) => row.key === "hero"));
  expect(getProducePhoto("mango")).toEqual(rows.find((row) => row.key === "mango"));
  expect(listPhotoCredits()).toEqual(photoCreditsInOrder(rows));
});

it("rejects a valid hero row or a valid produce row", () => {
  expect(
    parsePhotoRows(
      [
        photoRow(),
        photoRow({
          key: "mango",
          file: mangoFile,
          width: 1200,
          credit_required: false,
        }),
      ],
      context,
    ),
  ).toEqual([
    photoRow(),
    photoRow({
      key: "mango",
      file: mangoFile,
      width: 1200,
      credit_required: false,
    }),
  ]);
});

it("accepts photo rows that are not an array", () => {
  expect(thrownMessage(photoRow())).toBe("photo rows: not an array");
});

it("accepts a null photo row", () => {
  expect(thrownMessage([null])).toBe("photo row 0: not an object");
});

it("accepts a photo row that omits a field", () => {
  const { licence_url: omitted, ...withoutLicenceUrl } = photoRow();
  expect(omitted).toBe("https://localhost/licence");
  expect(thrownMessage([withoutLicenceUrl])).toBe("photo row 0: missing licence_url");
});

it("accepts a photo field of the wrong type", () => {
  expect(thrownMessage([photoRow({ alt_en: 4 })])).toBe("photo row 0: alt_en must be a string");
  expect(thrownMessage([photoRow({ width: "1600" })])).toBe("photo row 0: width must be a positive integer");
  expect(thrownMessage([photoRow({ credit_required: "yes" })])).toBe(
    "photo row 0: credit_required must be a boolean",
  );
});

it("copies an extra key onto a parsed photo row", () => {
  const parsed = parsePhotoRows([photoRow({ note: "extra" })], context);
  expect(parsed).toEqual([photoRow()]);
  expect(Object.hasOwn(parsed[0], "note")).toBe(false);
});

it("accepts an unknown photo key", () => {
  const message = thrownMessage([photoRow({ key: "kiwi" })]);
  expect(message).toBe("photo row 0: key must be hero or a produce slug");
  expect(message).not.toContain("kiwi");
});

it("accepts a duplicate photo key", () => {
  const message = thrownMessage([photoRow(), photoRow()]);
  expect(message).toBe("photo row 1: key must be unique");
  expect(message).not.toContain("hero");
});

it("accepts a file outside /photos/", () => {
  expect(thrownMessage([photoRow({ file: "/images/stall.avif" })])).toBe(
    "photo row 0: file must start with /photos/",
  );
});

it("accepts a file that climbs out of /photos/", () => {
  expect(thrownMessage([photoRow({ file: "/photos/../stall.avif" })])).toBe(
    "photo row 0: file must not contain ..",
  );
});

it("accepts a png photograph", () => {
  expect(thrownMessage([photoRow({ file: "/photos/hero/stall.png" })])).toBe(
    "photo row 0: file must end with .avif, .webp or .jpg",
  );
});

it("accepts a photograph that is not in public", () => {
  const message = thrownMessage([
    photoRow({ key: "mango", file: "/photos/produce/missing.jpg", width: 1200 }),
  ]);
  expect(message).toBe("photo row 0: file does not exist in public");
  expect(message).not.toContain("missing");
});

it("accepts a hero narrower than 1600", () => {
  expect(thrownMessage([photoRow({ width: 1599 })])).toBe("photo row 0: width must be at least 1600");
});

it("accepts a produce photograph narrower than 1200", () => {
  expect(thrownMessage([photoRow({ key: "mango", file: mangoFile, width: 1199 })])).toBe(
    "photo row 0: width must be at least 1200",
  );
});

it("accepts a height that is zero or fractional", () => {
  expect(thrownMessage([photoRow({ height: 0 })])).toBe("photo row 0: height must be a positive integer");
  expect(thrownMessage([photoRow({ height: 1.5 })])).toBe("photo row 0: height must be a positive integer");
});

it("accepts an empty alt, author or licence", () => {
  expect(thrownMessage([photoRow({ alt_en: "" })])).toBe("photo row 0: alt_en must be non-empty");
  expect(thrownMessage([photoRow({ alt_ar: "" })])).toBe("photo row 0: alt_ar must be non-empty");
  expect(thrownMessage([photoRow({ author: "" })])).toBe("photo row 0: author must be non-empty");
  expect(thrownMessage([photoRow({ licence: "" })])).toBe("photo row 0: licence must be non-empty");
});

it("accepts a source link that is not https", () => {
  const message = thrownMessage([photoRow({ source_url: "http://localhost/source" })]);
  expect(message).toBe("photo row 0: source_url must begin with https://");
  expect(message).not.toContain("localhost");
});

it("accepts an empty licence link", () => {
  expect(thrownMessage([photoRow({ licence_url: "" })])).toBe(
    "photo row 0: licence_url must begin with https://",
  );
});

it("keeps an uncredited row or reorders the credits", () => {
  const rows = parsePhotoRows(
    [
      photoRow({ credit_required: false }),
      photoRow({ key: "mango", file: mangoFile, width: 1200, credit_required: true }),
      photoRow({ key: "dates", file: datesFile, width: 1200, credit_required: false }),
      photoRow({ key: "okra", file: okraFile, width: 1200, credit_required: true }),
    ],
    context,
  );
  expect(photoCreditsInOrder(rows).map((row) => row.key)).toEqual(["mango", "okra"]);
  expect(listPhotoCredits()).toEqual(photoCreditsInOrder(parsePhotoRows(
    JSON.parse(readFileSync(path.join(process.cwd(), "content/photos.json"), "utf8")),
    { slugs, fileExists: realFileExists },
  )));
});
