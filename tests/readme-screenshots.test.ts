import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const captures = [
  "home-en-light.png",
  "home-en-dark.png",
  "home-ar-light.png",
  "home-ar-dark.png",
  "guide-en-light.png",
  "guide-en-dark.png",
  "guide-ar-light.png",
  "guide-ar-dark.png",
  "mango-en-light.png",
  "mango-en-dark.png",
  "mango-ar-light.png",
  "mango-ar-dark.png",
] as const;

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24) throw new Error("png header is short");
  for (let index = 0; index < pngSignature.length; index += 1) {
    if (bytes[index] !== pngSignature[index]) throw new Error("png signature does not match");
  }
  if (bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error("png header is not IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

it.each(captures)("lets %s be missing or a size other than 1280 by 800", (name) => {
  const bytes = readFileSync(new URL(`../docs/screenshots/${name}`, import.meta.url));
  expect(pngSize(bytes)).toEqual({ width: 1280, height: 800 });
});

it("lets the README omit one of the twelve captures or link a file that is not there", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const refs = [...readme.matchAll(/docs\/screenshots\/([A-Za-z0-9.-]+\.png)/g)].map((match) => match[1] ?? "");
  for (const name of captures) expect(refs).toContain(name);
  for (const name of refs) {
    const bytes = readFileSync(new URL(`../docs/screenshots/${name}`, import.meta.url));
    expect(bytes.length).toBeGreaterThan(24);
  }
});
