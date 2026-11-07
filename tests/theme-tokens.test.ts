import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

function balanced(source: string, braceIndex: number): string {
  let depth = 0;
  for (let index = braceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceIndex + 1, index);
    }
  }
  return "";
}

function bodyAfter(selector: string, source: string): string {
  const at = source.indexOf(selector);
  if (at < 0) return "";
  const brace = source.indexOf("{", at);
  if (brace < 0) return "";
  return balanced(source, brace);
}

function declarations(block: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of block.matchAll(/(--[A-Za-z0-9-]+|color-scheme)\s*:\s*([^;]+);/g)) {
    found.set(match[1] ?? "", (match[2] ?? "").trim());
  }
  return found;
}

function rootBody(): string {
  const match = /(?:^|\n):root\s*\{/.exec(css);
  if (!match) return "";
  return balanced(css, match.index + match[0].length - 1);
}

function mediaDarkBody(): string {
  const media = bodyAfter("@media (prefers-color-scheme: dark)", css);
  return bodyAfter(':root:not([data-theme="light"])', media);
}

const rootDecls = declarations(rootBody());
const mediaDecls = declarations(mediaDarkBody());
const darkDecls = declarations(bodyAfter(':root[data-theme="dark"]', css));
const lightDecls = declarations(bodyAfter(':root[data-theme="light"]', css));

it("drops a --color-* or --texture-ink value from either dark block", () => {
  const needed = [...rootDecls.keys()].filter((name) => name.startsWith("--color-") || name === "--texture-ink");
  expect(needed.length).toBeGreaterThan(0);
  for (const name of needed) {
    expect(mediaDecls.get(name), `media ${name}`).toBeTruthy();
    expect(darkDecls.get(name), `dark ${name}`).toBeTruthy();
  }
});

it("lets the two dark blocks differ on a token", () => {
  expect(Object.fromEntries(mediaDecls)).toEqual(Object.fromEntries(darkDecls));
});

it("omits color-scheme from the root, the light choice, or a dark block", () => {
  expect(rootDecls.get("color-scheme")).toBe("light dark");
  expect(lightDecls.get("color-scheme")).toBe("light");
  expect(darkDecls.get("color-scheme")).toBe("dark");
  expect(mediaDecls.get("color-scheme")).toBe("dark");
});
