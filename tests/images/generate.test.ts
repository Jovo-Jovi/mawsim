import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";
import { parsePhotoRows } from "../../src/modules/produce/photos";
import { planSlots, readImageSize, requestImage, run } from "../../scripts/images/generate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SECRET = "test-key-not-real";
const HERO_PROMPT =
  "A wider market composition of several produce on a crate, warm natural daylight from one side, soft shadows, a natural photograph with real texture, no text, no logos, no hands or people, no glossy or plastic look";
const TEXTURE_PROMPT =
  "A flat, even, overhead close-up of linen weave with no produce and no strong shadow, a natural photograph with real texture, no text, no logos, no hands or people, no glossy or plastic look";
const TOMATO_PROMPT =
  "One fresh Tomato (vegetable) or a small group of it, warm natural daylight from one side, soft shadows, three-quarter view from slightly above, centred with a margin, on wood, a natural photograph with real texture, no text, no logos, no hands or people, no glossy or plastic look";
const SLOT_ORDER = [
  "hero",
  "texture",
  "tomato",
  "mango",
  "orange",
  "strawberry",
  "watermelon",
  "guava",
  "pomegranate",
  "okra",
  "molokhia",
  "dates",
] as const;
const PRODUCE_NAMES = [
  "Tomato",
  "Mango",
  "Orange",
  "Strawberry",
  "Watermelon",
  "Guava",
  "Pomegranate",
  "Okra",
  "Molokhia",
  "Dates",
] as const;

interface SampleRow {
  slug: string;
  en: string;
  ar: string;
  kind: "fruit" | "vegetable" | "leafy";
}

interface Answer {
  status: number;
  json: () => Promise<unknown>;
}

interface CapturedCall {
  url: string;
  init: { method?: string; headers?: Record<string, string>; body?: string; redirect?: string };
}

const roots: string[] = [];
const repoPhotos = readFileSync(path.join(repoRoot, "content/photos.json"));
const repoHadPublic = existsSync(path.join(repoRoot, "public"));

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
  const photosNow = readFileSync(path.join(repoRoot, "content/photos.json"));
  if (!photosNow.equals(repoPhotos)) writeFileSync(path.join(repoRoot, "content/photos.json"), repoPhotos);
  if (!repoHadPublic && existsSync(path.join(repoRoot, "public"))) {
    rmSync(path.join(repoRoot, "public"), { recursive: true, force: true });
  }
});

function loadProduce(): SampleRow[] {
  const parsed: unknown = JSON.parse(readFileSync(path.join(repoRoot, "content/produce.json"), "utf8"));
  if (!Array.isArray(parsed)) throw new Error("produce fixture is not an array");
  return parsed.map((value) => {
    if (typeof value !== "object" || value === null) throw new Error("produce fixture row is not an object");
    const row = value as Record<string, unknown>;
    if (typeof row.slug !== "string" || typeof row.en !== "string" || typeof row.ar !== "string") {
      throw new Error("produce fixture row is missing a name");
    }
    if (row.kind !== "fruit" && row.kind !== "vegetable" && row.kind !== "leafy") {
      throw new Error("produce fixture kind is outside the closed set");
    }
    return { slug: row.slug, en: row.en, ar: row.ar, kind: row.kind };
  });
}

const produce = loadProduce();

function makeRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "mawsim-images-"));
  roots.push(root);
  mkdirSync(path.join(root, "content"), { recursive: true });
  writeFileSync(path.join(root, "content/produce.json"), readFileSync(path.join(repoRoot, "content/produce.json")));
  writeFileSync(path.join(root, "content/photos.json"), "[]\n");
  return root;
}

function pngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function jpegHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(23);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xfe;
  bytes.writeUInt16BE(4, 4);
  bytes[6] = 0x00;
  bytes[7] = 0x00;
  bytes[8] = 0xff;
  bytes[9] = 0xc2;
  bytes.writeUInt16BE(11, 10);
  bytes[12] = 0x08;
  bytes.writeUInt16BE(height, 13);
  bytes.writeUInt16BE(width, 15);
  bytes[17] = 0x01;
  bytes[18] = 0x01;
  bytes[19] = 0x11;
  bytes[20] = 0x00;
  return bytes;
}

function webpVp8(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8);
  bytes.write("VP8 ", 12);
  bytes.writeUInt32LE(10, 16);
  bytes[23] = 0x9d;
  bytes[24] = 0x01;
  bytes[25] = 0x2a;
  bytes.writeUInt16LE(width, 26);
  bytes.writeUInt16LE(height, 28);
  return bytes;
}

function webpVp8l(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(25);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(17, 4);
  bytes.write("WEBP", 8);
  bytes.write("VP8L", 12);
  bytes.writeUInt32LE(5, 16);
  bytes[20] = 0x2f;
  bytes.writeUInt32LE((width - 1) | ((height - 1) << 14), 21);
  return bytes;
}

function webpVp8x(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8);
  bytes.write("VP8X", 12);
  bytes.writeUInt32LE(10, 16);
  const widthMinus = width - 1;
  const heightMinus = height - 1;
  bytes[24] = widthMinus & 0xff;
  bytes[25] = (widthMinus >> 8) & 0xff;
  bytes[26] = (widthMinus >> 16) & 0xff;
  bytes[27] = heightMinus & 0xff;
  bytes[28] = (heightMinus >> 8) & 0xff;
  bytes[29] = (heightMinus >> 16) & 0xff;
  return bytes;
}

function answering(bytes: Buffer, calls: CapturedCall[] = []): (url: string, init: CapturedCall["init"]) => Promise<Answer> {
  return async (url, init) => {
    calls.push({ url, init });
    return { status: 200, async json() { return { data: [{ b64_json: bytes.toString("base64") }] }; } };
  };
}

function manifestText(root: string): string {
  return readFileSync(path.join(root, "content/photos.json"), "utf8");
}

function parseWritten(root: string) {
  const raw: unknown = JSON.parse(manifestText(root));
  return parsePhotoRows(raw, {
    slugs: produce.map((row) => row.slug),
    fileExists: (file) => existsSync(path.join(root, "public", file.slice(1))),
  });
}

it("drops a slot or reorders the twelve", () => {
  const slots = planSlots(produce);
  expect(slots.map((slot) => slot.key)).toEqual([...SLOT_ORDER]);
  expect(slots.map((slot) => slot.aspectRatio)).toEqual([
    "1:1",
    "1:1",
    "4:3",
    "4:3",
    "4:3",
    "4:3",
    "4:3",
    "4:3",
    "4:3",
    "4:3",
    "4:3",
    "4:3",
  ]);
});

it("omits a produce name or the words no text, or names a produce in the texture prompt", () => {
  const slots = planSlots(produce);
  const texture = slots.find((slot) => slot.key === "texture");
  expect(texture?.prompt).toBe(TEXTURE_PROMPT);
  for (const name of PRODUCE_NAMES) expect(texture?.prompt).not.toContain(name);
  expect(slots.find((slot) => slot.key === "hero")?.prompt).toBe(HERO_PROMPT);
  expect(slots.find((slot) => slot.key === "tomato")?.prompt).toBe(TOMATO_PROMPT);
  const surfaces = { fruit: "linen", vegetable: "wood", leafy: "a market crate" };
  for (const row of produce) {
    const prompt = slots.find((slot) => slot.key === row.slug)?.prompt ?? "";
    expect(prompt).toContain(row.en);
    expect(prompt).toContain("no text");
    expect(prompt).toContain(`(${row.kind})`);
    expect(prompt).toContain(`on ${surfaces[row.kind]}`);
    for (const other of produce) {
      if (other.en !== row.en) expect(prompt).not.toContain(other.en);
    }
  }
  expect(slots.find((slot) => slot.key === "hero")).toMatchObject({
    altEn: "Egyptian fruit and vegetables on a market crate in warm daylight",
    altAr: "فواكه وخضراوات مصرية على صندوق في السوق في ضوء نهار دافئ",
  });
  expect(slots.find((slot) => slot.key === "texture")).toMatchObject({
    altEn: "Linen texture",
    altAr: "نسيج من الكتان",
  });
  expect(slots.find((slot) => slot.key === "tomato")).toMatchObject({
    altEn: "Fresh Tomato on wood",
    altAr: "طماطم على سطح خشبي",
  });
  expect(slots.find((slot) => slot.key === "mango")).toMatchObject({
    altEn: "Fresh Mango on linen",
    altAr: "مانجو على قماش الكتان",
  });
  expect(slots.find((slot) => slot.key === "molokhia")).toMatchObject({
    altEn: "Fresh Molokhia on a market crate",
    altAr: "ملوخية على صندوق في السوق",
  });
});

it("sends the generation to the wrong url or with the wrong body", async () => {
  const root = makeRoot();
  const calls: CapturedCall[] = [];
  const code = await run({
    argv: ["--only", "hero,tomato", "--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 5, 12, 0, 0),
    fetchImpl: answering(pngHeader(1600, 1200), calls),
    stdout: () => undefined,
    stderr: () => undefined,
  });
  expect(code).toBe(0);
  expect(calls).toHaveLength(2);
  const bodies = calls.map((call) => {
    expect(call.url).toBe("https://api.x.ai/v1/images/generations");
    expect(call.init.method).toBe("POST");
    expect(call.init.redirect).toBe("error");
    expect(call.init.headers).toEqual({
      Authorization: "Bearer test-key-not-real",
      "Content-Type": "application/json",
    });
    return JSON.parse(call.init.body ?? "") as unknown;
  });
  expect(bodies[0]).toEqual({
    model: "grok-imagine-image-2.0",
    prompt: HERO_PROMPT,
    n: 1,
    resolution: "2k",
    aspect_ratio: "1:1",
    response_format: "b64_json",
  });
  expect(bodies[1]).toEqual({
    model: "grok-imagine-image-2.0",
    prompt: TOMATO_PROMPT,
    n: 1,
    resolution: "2k",
    aspect_ratio: "4:3",
    response_format: "b64_json",
  });
});

it("writes a manifest row the real photo parser rejects", async () => {
  const root = makeRoot();
  const lines: string[] = [];
  const code = await run({
    argv: ["--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 5, 12, 0, 0),
    fetchImpl: answering(pngHeader(1600, 1200)),
    stdout: (line) => lines.push(line),
    stderr: () => undefined,
  });
  expect(code).toBe(0);
  expect(lines).toEqual(SLOT_ORDER.map((key) => {
    if (key === "hero") return "hero /photos/hero/hero.png";
    if (key === "texture") return "texture /photos/texture/texture.png";
    return `${key} /photos/produce/${key}.png`;
  }));
  const text = manifestText(root);
  expect(text.endsWith("\n")).toBe(true);
  expect(text.startsWith("[\n  {\n")).toBe(true);
  expect(text).toContain('"source": "generated"');
  const rows = parseWritten(root);
  expect(rows.map((row) => row.key)).toEqual([...SLOT_ORDER]);
  expect(rows).toHaveLength(12);
  for (const row of rows) {
    expect(row.source).toBe("generated");
    expect(row.credit_required).toBe(true);
    if (row.source !== "generated") continue;
    expect(row.model).toBe("grok-imagine-image-2.0");
    expect(row.generated_on).toBe("2026-11-05");
    expect(row.terms_url).toBe("https://x.ai/legal/terms-of-service");
    expect(row.width).toBe(1600);
    expect(row.height).toBe(1200);
    expect(existsSync(path.join(root, "public", row.file.slice(1)))).toBe(true);
  }
  const hero = rows.find((row) => row.key === "hero");
  const texture = rows.find((row) => row.key === "texture");
  const dates = rows.find((row) => row.key === "dates");
  expect(hero?.alt_en).toBe("Egyptian fruit and vegetables on a market crate in warm daylight");
  expect(hero?.alt_ar).toBe("فواكه وخضراوات مصرية على صندوق في السوق في ضوء نهار دافئ");
  expect(texture?.alt_en).toBe("Linen texture");
  expect(texture?.alt_ar).toBe("نسيج من الكتان");
  expect(dates?.alt_en).toBe("Fresh Dates on linen");
  expect(dates?.alt_ar).toBe("بلح على قماش الكتان");
  const raw = JSON.parse(text) as unknown[];
  const first = raw[0] as Record<string, unknown>;
  expect(Object.keys(first).sort()).toEqual([
    "alt_ar",
    "alt_en",
    "credit_required",
    "file",
    "generated_on",
    "height",
    "key",
    "model",
    "prompt",
    "source",
    "terms_url",
    "width",
  ]);
  expect(repoPhotos.equals(readFileSync(path.join(repoRoot, "content/photos.json")))).toBe(true);
});

it("appends a duplicate row or moves a replaced key", async () => {
  const root = makeRoot();
  const first = await run({
    argv: ["--only", "hero,texture,tomato", "--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 5, 12, 0, 0),
    fetchImpl: answering(pngHeader(1600, 1200)),
    stdout: () => undefined,
    stderr: () => undefined,
  });
  const second = await run({
    argv: ["--only", "tomato", "--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 6, 12, 0, 0),
    fetchImpl: answering(pngHeader(1600, 1400)),
    stdout: () => undefined,
    stderr: () => undefined,
  });
  expect(first).toBe(0);
  expect(second).toBe(0);
  const rows = parseWritten(root);
  expect(rows.map((row) => row.key)).toEqual(["hero", "texture", "tomato"]);
  const hero = rows[0];
  const tomato = rows[2];
  expect(hero?.source).toBe("generated");
  expect(tomato?.source).toBe("generated");
  if (hero?.source !== "generated" || tomato?.source !== "generated") return;
  expect(hero.generated_on).toBe("2026-11-05");
  expect(hero.height).toBe(1200);
  expect(tomato.key).toBe("tomato");
  expect(tomato.generated_on).toBe("2026-11-06");
  expect(tomato.height).toBe(1400);
  expect(tomato.width).toBe(1600);
});

it("reports success for a failed status or invents an image from an empty answer", async () => {
  const secretBody = { error: SECRET, data: [{ url: `https://localhost/${SECRET}` }] };
  await expect(requestImage({
    fetchImpl: async () => ({ status: 401, async json() { return secretBody; } }),
    apiKey: SECRET,
    prompt: HERO_PROMPT,
    aspectRatio: "1:1",
  })).rejects.toThrow(/^xai: request failed with status 401$/);
  await expect(requestImage({
    fetchImpl: async () => ({ status: 200, async json() { return { data: [] }; } }),
    apiKey: SECRET,
    prompt: HERO_PROMPT,
    aspectRatio: "1:1",
  })).rejects.toThrow(/^xai: no image in the answer$/);
  await expect(requestImage({
    fetchImpl: async () => ({ status: 200, async json() { return { data: [{ b64_json: "" }] }; } }),
    apiKey: SECRET,
    prompt: HERO_PROMPT,
    aspectRatio: "1:1",
  })).rejects.toThrow(/^xai: no image in the answer$/);
  await expect(requestImage({
    fetchImpl: async () => {
      throw new Error(`down ${SECRET}`);
    },
    apiKey: SECRET,
    prompt: HERO_PROMPT,
    aspectRatio: "1:1",
  })).rejects.toThrow(/^xai: request failed$/);
});

it("reads a png, jpeg or webp header as the wrong size", () => {
  expect(readImageSize(pngHeader(1600, 1200))).toEqual({ format: "png", width: 1600, height: 1200 });
  expect(readImageSize(jpegHeader(32, 16))).toEqual({ format: "jpeg", width: 32, height: 16 });
  expect(readImageSize(webpVp8(32, 16))).toEqual({ format: "webp", width: 32, height: 16 });
  expect(readImageSize(webpVp8l(32, 16))).toEqual({ format: "webp", width: 32, height: 16 });
  expect(readImageSize(webpVp8x(1024, 768))).toEqual({ format: "webp", width: 1024, height: 768 });
});

it("accepts bytes that are not a png, jpeg or webp", () => {
  expect(() => readImageSize(Buffer.from("GIF89a"))).toThrow(/^image: unknown format$/);
  expect(() => readImageSize(Buffer.alloc(0))).toThrow(/^image: unknown format$/);
  expect(() => readImageSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toThrow(/^image: unknown format$/);
});

it("prints the api key or follows a url from the answer", async () => {
  const root = makeRoot();
  const logs: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map((part) => String(part)).join(" "));
  });
  const errorLog = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logs.push(args.map((part) => String(part)).join(" "));
  });
  const calls: string[] = [];
  const failed = await run({
    argv: ["--only", "hero", "--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 5, 12, 0, 0),
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        status: 500,
        async json() {
          return { error: SECRET, data: [{ url: `https://localhost/${SECRET}`, b64_json: SECRET }] };
        },
      };
    },
  });
  const saved = await run({
    argv: ["--only", "texture", "--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 5, 12, 0, 0),
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        status: 200,
        async json() {
          return { data: [{ url: `https://localhost/${SECRET}`, b64_json: pngHeader(1600, 1200).toString("base64") }] };
        },
      };
    },
  });
  expect(failed).toBe(1);
  expect(saved).toBe(0);
  expect(calls).toEqual(["https://api.x.ai/v1/images/generations", "https://api.x.ai/v1/images/generations"]);
  expect(logs.join("\n")).not.toContain(SECRET);
  expect(log).toHaveBeenCalled();
  expect(errorLog).toHaveBeenCalled();
  await expect(requestImage({
    fetchImpl: async () => {
      throw new Error(`socket ${SECRET}`);
    },
    apiKey: SECRET,
    prompt: HERO_PROMPT,
    aspectRatio: "1:1",
  })).rejects.toThrow(/^xai: request failed$/);
});

it("writes a file or a manifest row on a dry run", async () => {
  const root = makeRoot();
  const before = manifestText(root);
  const lines: string[] = [];
  let called = false;
  const code = await run({
    argv: ["--dry-run", "--root", root],
    cwd: root,
    env: {},
    fetchImpl: async () => {
      called = true;
      throw new Error("dry run called the network");
    },
    stdout: (line) => lines.push(line),
    stderr: () => undefined,
  });
  expect(code).toBe(0);
  expect(called).toBe(false);
  expect(lines).toHaveLength(12);
  expect(lines.map((line) => line.split(" ")[0])).toEqual([...SLOT_ORDER]);
  expect(lines[0]).toBe(`hero 1:1 ${HERO_PROMPT}`);
  expect(lines[1]).toBe(`texture 1:1 ${TEXTURE_PROMPT}`);
  expect(lines[2]).toBe(`tomato 4:3 ${TOMATO_PROMPT}`);
  expect(manifestText(root)).toBe(before);
  expect(existsSync(path.join(root, "public"))).toBe(false);
});

it("generates an unknown slot", async () => {
  const root = makeRoot();
  const stdout: string[] = [];
  const stderr: string[] = [];
  let called = false;
  const code = await run({
    argv: ["--dry-run", "--only", "kiwi", "--root", root],
    cwd: root,
    env: {},
    fetchImpl: async () => {
      called = true;
      throw new Error("unknown slot called the network");
    },
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });
  expect(code).toBe(1);
  expect(stderr).toEqual(["unknown slot: kiwi"]);
  expect(stdout).toEqual([]);
  expect(called).toBe(false);
  expect(existsSync(path.join(root, "public"))).toBe(false);
});

it("calls the api when the key is absent", async () => {
  const root = makeRoot();
  const stderr: string[] = [];
  let called = false;
  const code = await run({
    argv: ["--only", "hero", "--root", root],
    cwd: root,
    env: {},
    fetchImpl: async () => {
      called = true;
      throw new Error("missing key called the network");
    },
    stdout: () => undefined,
    stderr: (line) => stderr.push(line),
  });
  expect(code).toBe(1);
  expect(called).toBe(false);
  expect(stderr).toEqual([["XAI", "API", "KEY"].join("_") + " is not set"]);
  expect(existsSync(path.join(root, "public"))).toBe(false);
});

it("deletes an older file of the same slot or saves a jpeg under the png extension", async () => {
  const root = makeRoot();
  const oldFile = path.join(root, "public/photos/hero/hero.png");
  mkdirSync(path.dirname(oldFile), { recursive: true });
  writeFileSync(oldFile, "keep-me");
  const lines: string[] = [];
  const code = await run({
    argv: ["--only", "hero", "--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 5, 12, 0, 0),
    fetchImpl: answering(jpegHeader(1600, 1200)),
    stdout: (line) => lines.push(line),
    stderr: () => undefined,
  });
  expect(code).toBe(0);
  expect(lines).toEqual(["hero /photos/hero/hero.jpg unused /photos/hero/hero.png"]);
  expect(readFileSync(oldFile, "utf8")).toBe("keep-me");
  const rows = parseWritten(root);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.file).toBe("/photos/hero/hero.jpg");
  expect(rows[0]?.width).toBe(1600);
  expect(rows[0]?.height).toBe(1200);
  const texture = await run({
    argv: ["--only", "texture", "--root", root],
    cwd: root,
    env: {},
    apiKey: SECRET,
    now: new Date(2026, 10, 5, 12, 0, 0),
    fetchImpl: answering(webpVp8x(1024, 1024)),
    stdout: () => undefined,
    stderr: () => undefined,
  });
  expect(texture).toBe(0);
  const both = parseWritten(root);
  expect(both.map((row) => row.file)).toEqual(["/photos/hero/hero.jpg", "/photos/texture/texture.webp"]);
  expect(both[1]?.width).toBe(1024);
});
