import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const domainDir = path.join(root, "src/domain");

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

function specifiers(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) found.push(match[1]);
  }
  return found;
}

function pointsAtApp(spec: string, fromFile: string): boolean {
  const normalized = spec.replaceAll("\\", "/");
  if (normalized === "src/app" || normalized.startsWith("src/app/") || normalized.includes("/src/app/")) return true;
  if (!normalized.startsWith(".")) return false;
  const resolved = path.normalize(path.join(path.dirname(fromFile), normalized));
  const rel = path.relative(root, resolved).replaceAll("\\", "/");
  return rel === "src/app" || rel.startsWith("src/app/");
}

function isForbidden(spec: string, fromFile: string): boolean {
  if (spec === "next" || spec.startsWith("next/")) return true;
  if (spec === "react" || spec.startsWith("react/")) return true;
  if (spec === "react-dom" || spec.startsWith("react-dom/")) return true;
  if (spec === "pg" || spec.startsWith("pg/")) return true;
  if (spec === "firebase" || spec.startsWith("firebase/")) return true;
  if (spec === "firebase-admin" || spec.startsWith("firebase-admin/")) return true;
  if (spec === "mongodb" || spec.startsWith("mongodb/")) return true;
  if (spec.startsWith("@supabase/")) return true;
  if (spec === "@prisma/client") return true;
  if (spec === "@/app" || spec.startsWith("@/app/")) return true;
  return pointsAtApp(spec, fromFile);
}

function listTypeScript(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...listTypeScript(full));
    else if (/\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

const fromDomain = path.join(domainDir, "index.ts");

const forbiddenSamples = [
  'import a from "next"',
  'import b from "next/link"',
  'import c from "react"',
  'import d from "react-dom"',
  'import e from "@/app"',
  'import f from "@/app/page"',
  'import g from "../app/page"',
  'import h from "src/app/page"',
  'import i from "@supabase/supabase-js"',
  'import j from "pg"',
  'import k from "firebase"',
  'import l from "firebase/app"',
  'import m from "firebase-admin"',
  'import n from "mongodb"',
  'import o from "@prisma/client"',
  'const p = import("next/link")',
  'const q = require("react")',
  'export { r } from "next/navigation"',
];

it("rejects framework, app and database imports from src/domain", () => {
  const caught = forbiddenSamples.filter((sample) => {
    const specs = specifiers(sample);
    return specs.length > 0 && specs.some((spec) => isForbidden(spec, fromDomain));
  });
  expect(caught).toEqual(forbiddenSamples);
});

it("allows a relative domain import and node:path", () => {
  const allowed = specifiers('import y from "../domain/y"\nimport p from "node:path"');
  expect(allowed).toEqual(["../domain/y", "node:path"]);
  expect(allowed.filter((spec) => isForbidden(spec, fromDomain))).toEqual([]);
});

it("reads every src/domain TypeScript file and finds no forbidden import", () => {
  const files = listTypeScript(domainDir);
  const relative = files.map((file) => path.relative(root, file).replaceAll("\\", "/"));
  expect(relative).toContain("src/domain/index.ts");
  const violations = files.flatMap((file) =>
    specifiers(readFileSync(file, "utf8"))
      .filter((spec) => isForbidden(spec, file))
      .map((spec) => `${path.relative(root, file)} ${spec}`),
  );
  expect(violations).toEqual([]);
});
