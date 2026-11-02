import { afterEach, expect, it, vi } from "vitest";
import nextConfig from "../next.config";

const PRODUCTION_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'";

const PRODUCTION_HEADERS = [
  { key: "Content-Security-Policy", value: PRODUCTION_CSP },
  { key: "Strict-Transport-Security", value: "max-age=86400" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

afterEach(() => {
  vi.unstubAllEnvs();
});

function parts(value: string, separator: string): string[] {
  const found: string[] = [];
  let rest = value.trim();
  while (rest !== "") {
    const at = rest.indexOf(separator);
    if (at < 0) {
      found.push(rest);
      break;
    }
    const piece = rest.slice(0, at).trim();
    if (piece !== "") found.push(piece);
    rest = rest.slice(at + separator.length).trim();
  }
  return found;
}

async function headerRule() {
  const load = nextConfig.headers;
  if (load === undefined) throw new Error("next.config headers is missing");
  const loaded = await load();
  expect(loaded).toHaveLength(1);
  const rule = loaded[0];
  if (rule === undefined) throw new Error("header rule is missing");
  return rule;
}

it("drops, adds, renames or retargets a production security header", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const rule = await headerRule();
  expect(rule.source).toBe("/:path*");
  expect(rule.headers.map((header) => header.key)).toEqual([
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Frame-Options",
  ]);
  expect(rule.headers).toEqual(PRODUCTION_HEADERS);
});

it("lets the production CSP eval scripts, load a remote host, or allow objects, frames or forms", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const rule = await headerRule();
  const csp = rule.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toContain("http:");
  expect(csp).not.toContain("https:");
  expect(csp).not.toContain("*");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("form-action 'none'");
  const sources = parts(csp, ";").flatMap((directive) => parts(directive, " ").slice(1));
  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    expect(["'self'", "'unsafe-inline'", "'none'", "data:"]).toContain(source);
  }
});

it("adds includeSubDomains or preload to Strict-Transport-Security", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const rule = await headerRule();
  const hsts = rule.headers.find((header) => header.key === "Strict-Transport-Security")?.value;
  expect(hsts).toBe("max-age=86400");
  expect(hsts ?? "").not.toContain("includeSubDomains");
  expect(hsts ?? "").not.toContain("preload");
});

it("changes a development header besides adding unsafe-eval to script-src", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const rule = await headerRule();
  const csp = rule.headers.find((header) => header.key === "Content-Security-Policy")?.value;
  expect(csp).toBe(
    PRODUCTION_CSP.replace(
      "script-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    ),
  );
  expect(rule.headers.filter((header) => header.key !== "Content-Security-Policy")).toEqual(
    PRODUCTION_HEADERS.filter((header) => header.key !== "Content-Security-Policy"),
  );
});

it("serves a CSP other than production when NODE_ENV is test", async () => {
  vi.stubEnv("NODE_ENV", "test");
  const rule = await headerRule();
  const csp = rule.headers.find((header) => header.key === "Content-Security-Policy")?.value;
  expect(csp).toBe(PRODUCTION_CSP);
  expect(rule.headers).toEqual(PRODUCTION_HEADERS);
});

it("serves a CSP other than production when NODE_ENV is unset", async () => {
  vi.stubEnv("NODE_ENV", undefined);
  const rule = await headerRule();
  const csp = rule.headers.find((header) => header.key === "Content-Security-Policy")?.value;
  expect(csp).toBe(PRODUCTION_CSP);
  expect(process.env.NODE_ENV).toBeUndefined();
  expect(rule.headers).toEqual(PRODUCTION_HEADERS);
});

it("leaves poweredByHeader on or turns cacheComponents or partialPrefetching off", () => {
  expect(nextConfig.poweredByHeader).toBe(false);
  expect(nextConfig.cacheComponents).toBe(true);
  expect(nextConfig.partialPrefetching).toBe(true);
});
