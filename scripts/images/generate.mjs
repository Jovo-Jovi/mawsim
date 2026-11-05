// Owner-run image generator (OD-10 §3). The site never imports this file.
// The key comes from the environment only. Nothing here writes a .env file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ENDPOINT = "https://api.x.ai/v1/images/generations";
const MODEL_ID = "grok-imagine-image-2.0";
const TERMS_URL = "https://x.ai/legal/terms-of-service";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FILE_SUFFIXES = [".avif", ".webp", ".jpg", ".png"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Prompt text the owner can tune. Alt sentences for generated rows sit with them. */
export const PROMPT_TEMPLATES = {
  produce:
    "One fresh {name} ({kind}) or a small group of it, warm natural daylight from one side, soft shadows, three-quarter view from slightly above, centred with a margin, on {surface}, a natural photograph with real texture, no text, no logos, no hands or people, no glossy or plastic look",
  hero:
    "A wider market composition of several produce on a crate, warm natural daylight from one side, soft shadows, a natural photograph with real texture, no text, no logos, no hands or people, no glossy or plastic look",
  texture:
    "A flat, even, overhead close-up of linen weave with no produce and no strong shadow, a natural photograph with real texture, no text, no logos, no hands or people, no glossy or plastic look",
  alt: {
    produceEn: "Fresh {name} on {surface}",
    produceAr: "{name} على {surface}",
    heroEn: "Egyptian fruit and vegetables on a market crate in warm daylight",
    heroAr: "فواكه وخضراوات مصرية على صندوق في السوق في ضوء نهار دافئ",
    textureEn: "Linen texture",
    textureAr: "نسيج من الكتان",
  },
};

const SURFACE = {
  fruit: { en: "linen", ar: "قماش الكتان" },
  vegetable: { en: "wood", ar: "سطح خشبي" },
  leafy: { en: "a market crate", ar: "صندوق في السوق" },
};

/**
 * @param {string} template
 * @param {Record<string, string>} values
 */
function fill(template, values) {
  return template.replace(/\{(name|kind|surface)\}/g, (_token, key) => {
    const value = values[key];
    if (typeof value !== "string") throw new Error("prompt: placeholder is missing");
    return value;
  });
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlain(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} row
 */
function assertProduceRow(row) {
  if (!isPlain(row)) throw new Error("produce.json: row is not an object");
  if (typeof row.slug !== "string" || !SLUG_PATTERN.test(row.slug)) {
    throw new Error("produce.json: slug is not a single segment");
  }
  if (typeof row.en !== "string" || row.en.length === 0 || typeof row.ar !== "string" || row.ar.length === 0) {
    throw new Error("produce.json: name is missing");
  }
  if (row.kind !== "fruit" && row.kind !== "vegetable" && row.kind !== "leafy") {
    throw new Error("produce.json: kind is not fruit, vegetable or leafy");
  }
}

/**
 * Slots in manifest order: hero, texture, then each produce row.
 * @param {readonly { slug: string, en: string, ar: string, kind: "fruit" | "vegetable" | "leafy" }[]} produceRows
 */
export function planSlots(produceRows) {
  const hero = {
    key: "hero",
    aspectRatio: "1:1",
    prompt: PROMPT_TEMPLATES.hero,
    altEn: PROMPT_TEMPLATES.alt.heroEn,
    altAr: PROMPT_TEMPLATES.alt.heroAr,
  };
  const texture = {
    key: "texture",
    aspectRatio: "1:1",
    prompt: PROMPT_TEMPLATES.texture,
    altEn: PROMPT_TEMPLATES.alt.textureEn,
    altAr: PROMPT_TEMPLATES.alt.textureAr,
  };
  const produce = produceRows.map((row) => {
    assertProduceRow(row);
    const surface = SURFACE[row.kind];
    return {
      key: row.slug,
      aspectRatio: "4:3",
      prompt: fill(PROMPT_TEMPLATES.produce, { name: row.en, kind: row.kind, surface: surface.en }),
      altEn: fill(PROMPT_TEMPLATES.alt.produceEn, { name: row.en, surface: surface.en }),
      altAr: fill(PROMPT_TEMPLATES.alt.produceAr, { name: row.ar, surface: surface.ar }),
    };
  });
  return [hero, texture, ...produce];
}

/**
 * @param {Buffer | Uint8Array} buffer
 * @returns {{ format: "png" | "jpeg" | "webp", width: number, height: number }}
 */
export function readImageSize(buffer) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw new Error("image: unknown format");
  }
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const png = readPng(bytes);
  if (png) return png;
  const jpeg = readJpeg(bytes);
  if (jpeg) return jpeg;
  const webp = readWebp(bytes);
  if (webp) return webp;
  throw new Error("image: unknown format");
}

/**
 * @param {Buffer} bytes
 */
function readPng(bytes) {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (bytes.length < 24 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("image: unknown format");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1) throw new Error("image: unknown format");
  return { format: "png", width, height };
}

/**
 * @param {Buffer} bytes
 */
function readJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("image: unknown format");
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) throw new Error("image: unknown format");
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0x00 || marker === 0x01 || marker === 0xd8 || marker === 0xd9) continue;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 1 >= bytes.length) throw new Error("image: unknown format");
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2) throw new Error("image: unknown format");
    if (marker >= 0xc0 && marker <= 0xc3) {
      if (offset + 6 >= bytes.length) throw new Error("image: unknown format");
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      if (width < 1 || height < 1) throw new Error("image: unknown format");
      return { format: "jpeg", width, height };
    }
    offset += segmentLength;
  }
  throw new Error("image: unknown format");
}

/**
 * @param {Buffer} bytes
 */
function readWebp(bytes) {
  if (bytes.length < 12 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const tag = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (tag === "VP8 ") return readVp8(bytes, start);
    if (tag === "VP8L") return readVp8l(bytes, start);
    if (tag === "VP8X") return readVp8x(bytes, start);
    if (size > bytes.length) throw new Error("image: unknown format");
    offset = start + size + (size & 1);
  }
  throw new Error("image: unknown format");
}

/**
 * @param {Buffer} bytes
 * @param {number} start
 */
function readVp8(bytes, start) {
  if (start + 10 > bytes.length) throw new Error("image: unknown format");
  const hasStartCode = bytes[start + 3] === 0x9d && bytes[start + 4] === 0x01 && bytes[start + 5] === 0x2a;
  if (!hasStartCode) throw new Error("image: unknown format");
  const width = bytes.readUInt16LE(start + 6) & 0x3fff;
  const height = bytes.readUInt16LE(start + 8) & 0x3fff;
  if (width < 1 || height < 1) throw new Error("image: unknown format");
  return { format: "webp", width, height };
}

/**
 * @param {Buffer} bytes
 * @param {number} start
 */
function readVp8l(bytes, start) {
  if (start + 5 > bytes.length || bytes[start] !== 0x2f) throw new Error("image: unknown format");
  const bits = bytes.readUInt32LE(start + 1);
  const width = (bits & 0x3fff) + 1;
  const height = ((bits >> 14) & 0x3fff) + 1;
  return { format: "webp", width, height };
}

/**
 * @param {Buffer} bytes
 * @param {number} start
 */
function readVp8x(bytes, start) {
  if (start + 10 > bytes.length) throw new Error("image: unknown format");
  const width = 1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16);
  const height = 1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16);
  if (width < 1 || height < 1) throw new Error("image: unknown format");
  return { format: "webp", width, height };
}

/**
 * @param {"png" | "jpeg" | "webp"} format
 */
function extensionFor(format) {
  if (format === "png") return ".png";
  if (format === "jpeg") return ".jpg";
  if (format === "webp") return ".webp";
  throw new Error("image: unknown format");
}

/**
 * @param {string} key
 */
function slotLocation(key) {
  if (key === "hero") return { folder: "hero", base: "hero" };
  if (key === "texture") return { folder: "texture", base: "texture" };
  return { folder: "produce", base: key };
}

/**
 * @param {{
 *   fetchImpl: (url: string, init: { method: string, headers: Record<string, string>, body: string, redirect: "error" }) => Promise<{ status: number, json: () => Promise<unknown> }>,
 *   apiKey: string,
 *   prompt: string,
 *   aspectRatio: string,
 * }} input
 * @returns {Promise<Buffer>}
 */
export async function requestImage(input) {
  let response;
  try {
    response = await input.fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        prompt: input.prompt,
        n: 1,
        resolution: "2k",
        aspect_ratio: input.aspectRatio,
        response_format: "b64_json",
      }),
      redirect: "error",
    });
  } catch {
    throw new Error("xai: request failed");
  }
  const status = response && typeof response.status === "number" ? response.status : Number.NaN;
  if (!Number.isInteger(status) || status < 200 || status >= 300) {
    const code = Number.isInteger(status) ? String(status) : "unknown";
    throw new Error(`xai: request failed with status ${code}`);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("xai: no image in the answer");
  }
  const first = isPlain(payload) && Array.isArray(payload.data) ? payload.data[0] : undefined;
  const encoded = isPlain(first) ? first.b64_json : undefined;
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new Error("xai: no image in the answer");
  }
  return Buffer.from(encoded, "base64");
}

/**
 * @param {readonly string[]} argv
 */
function parseArgs(argv) {
  let dryRun = false;
  let root = null;
  /** @type {string[] | null} */
  let only = null;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--only" || token === "--root") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { error: `missing value: ${token}` };
      }
      index += 1;
      if (token === "--only") only = value.split(",");
      else root = value;
      continue;
    }
    if (token.startsWith("--")) return { error: `unknown argument: ${token}` };
    return { error: "unknown argument" };
  }
  return { dryRun, root, only };
}

/**
 * @param {string} root
 * @param {string} name
 */
function readJsonArray(root, name) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path.join(root, "content", name), "utf8"));
  } catch {
    throw new Error(`${name}: not readable`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${name}: not an array`);
  return parsed;
}

/**
 * @param {readonly Record<string, unknown>[]} rows
 * @param {Record<string, unknown>} row
 */
function upsertRow(rows, row) {
  const index = rows.findIndex((existing) => isPlain(existing) && existing.key === row.key);
  if (index === -1) return [...rows, row];
  return rows.map((existing, position) => (position === index ? row : existing));
}

/**
 * @param {string} root
 * @param {string} folder
 * @param {string} base
 * @param {string} extension
 */
function unusedPublicPaths(root, folder, base, extension) {
  const unused = [];
  for (const suffix of FILE_SUFFIXES) {
    if (suffix === extension) continue;
    const absolute = path.join(root, "public", "photos", folder, `${base}${suffix}`);
    if (existsSync(absolute)) unused.push(`/photos/${folder}/${base}${suffix}`);
  }
  return unused;
}

/**
 * @param {Date | (() => Date)} now
 */
function formatGeneratedOn(now) {
  const date = typeof now === "function" ? now() : now;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new Error("image: clock is unusable");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * @param {string} message
 * @param {readonly (string | undefined)[]} secrets
 */
function scrub(message, secrets) {
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length > 0 && message.includes(secret)) return "image: failed";
  }
  return message;
}

/**
 * @param {{
 *   argv?: readonly string[],
 *   env?: Record<string, string | undefined>,
 *   cwd?: string,
 *   fetchImpl?: (url: string, init: { method: string, headers: Record<string, string>, body: string, redirect: "error" }) => Promise<{ status: number, json: () => Promise<unknown> }>,
 *   now?: Date | (() => Date),
 *   stdout?: (line: string) => void,
 *   stderr?: (line: string) => void,
 *   apiKey?: string,
 * }} [options]
 * @returns {Promise<number>}
 */
export async function run(options = {}) {
  const stderr = options.stderr ?? ((line) => console.error(line));
  const secrets = [options.apiKey, options.env?.XAI_API_KEY];
  try {
    return await execute(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "image: failed";
    stderr(scrub(message, secrets));
    return 1;
  }
}

/**
 * @param {{
 *   argv?: readonly string[],
 *   env?: Record<string, string | undefined>,
 *   cwd?: string,
 *   fetchImpl?: (url: string, init: { method: string, headers: Record<string, string>, body: string, redirect: "error" }) => Promise<{ status: number, json: () => Promise<unknown> }>,
 *   now?: Date | (() => Date),
 *   stdout?: (line: string) => void,
 *   stderr?: (line: string) => void,
 *   apiKey?: string,
 * }} options
 */
async function execute(options) {
  const stdout = options.stdout ?? ((line) => console.log(line));
  const stderr = options.stderr ?? ((line) => console.error(line));
  const parsed = parseArgs(options.argv ?? []);
  if ("error" in parsed && parsed.error) {
    stderr(parsed.error);
    return 1;
  }
  const cwd = options.cwd ?? process.cwd();
  const root = path.resolve(cwd, parsed.root ?? ".");
  const produce = readJsonArray(root, "produce.json");
  for (const row of produce) assertProduceRow(row);
  const slots = planSlots(produce);
  const selected = selectSlots(slots, parsed.only);
  if (selected.error) {
    stderr(selected.error);
    return 1;
  }
  if (parsed.dryRun) {
    for (const slot of selected.slots) stdout(`${slot.key} ${slot.aspectRatio} ${slot.prompt}`);
    return 0;
  }
  const apiKey = typeof options.apiKey === "string" && options.apiKey.length > 0
    ? options.apiKey
    : options.env?.XAI_API_KEY;
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    stderr("XAI_API_KEY is not set");
    return 1;
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const generatedOn = formatGeneratedOn(options.now ?? (() => new Date()));
  let rows = readJsonArray(root, "photos.json");
  for (const slot of selected.slots) {
    const bytes = await requestImage({
      fetchImpl,
      apiKey,
      prompt: slot.prompt,
      aspectRatio: slot.aspectRatio,
    });
    const size = readImageSize(bytes);
    const extension = extensionFor(size.format);
    const place = slotLocation(slot.key);
    const unused = unusedPublicPaths(root, place.folder, place.base, extension);
    const absolute = path.join(root, "public", "photos", place.folder, `${place.base}${extension}`);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, bytes);
    const file = `/photos/${place.folder}/${place.base}${extension}`;
    const row = {
      key: slot.key,
      file,
      width: size.width,
      height: size.height,
      alt_en: slot.altEn,
      alt_ar: slot.altAr,
      source: "generated",
      credit_required: true,
      model: MODEL_ID,
      prompt: slot.prompt,
      generated_on: generatedOn,
      terms_url: TERMS_URL,
    };
    rows = upsertRow(rows, row);
    writeFileSync(path.join(root, "content", "photos.json"), `${JSON.stringify(rows, null, 2)}\n`);
    const unusedText = unused.length > 0 ? ` unused ${unused.join(" ")}` : "";
    stdout(`${slot.key} ${file}${unusedText}`);
  }
  return 0;
}

/**
 * @param {readonly { key: string }[]} slots
 * @param {string[] | null} only
 */
function selectSlots(slots, only) {
  if (only === null) return { slots };
  const known = new Set(slots.map((slot) => slot.key));
  for (const key of only) {
    if (!known.has(key)) return { error: `unknown slot: ${key}` };
  }
  const wanted = new Set(only);
  return { slots: slots.filter((slot) => wanted.has(slot.key)) };
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  run({
    argv: process.argv.slice(2),
    env: process.env,
    cwd: process.cwd(),
    fetchImpl: globalThis.fetch,
    now: () => new Date(),
  }).then(
    (code) => {
      process.exitCode = code;
    },
    () => {
      console.error("image: failed");
      process.exitCode = 1;
    },
  );
}
