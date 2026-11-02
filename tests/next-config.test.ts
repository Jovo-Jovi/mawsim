import { expect, it } from "vitest";
import nextConfig from "../next.config";

async function redirects() {
  const load = nextConfig.redirects;
  if (load === undefined) throw new Error("next.config redirects is missing");
  return load();
}

it("adds, drops or retargets the only temporary redirect from / to /ar", async () => {
  expect(await redirects()).toEqual([{ source: "/", destination: "/ar", permanent: false }]);
});

it("loops the root redirect by using its destination as another source", async () => {
  const loaded = await redirects();
  const sources = loaded.map((entry) => entry.source);
  expect(sources).toEqual(["/"]);
  for (const entry of loaded) {
    expect(sources).not.toContain(entry.destination);
  }
});

it("adds a rewrite", () => {
  expect(nextConfig.rewrites).toBeUndefined();
});

it("sets an experimental flag other than globalNotFound", () => {
  const experimental = nextConfig.experimental;
  if (experimental === undefined) {
    expect(experimental).toBeUndefined();
    return;
  }
  expect(experimental).toEqual({ globalNotFound: true });
});

it("conditions the security header rule with has, missing, basePath or locale", async () => {
  const load = nextConfig.headers;
  if (load === undefined) throw new Error("next.config headers is missing");
  const loaded = await load();
  expect(loaded).toHaveLength(1);
  const rule = loaded[0];
  expect(rule).toBeDefined();
  expect(Object.hasOwn(rule ?? {}, "has")).toBe(false);
  expect(Object.hasOwn(rule ?? {}, "missing")).toBe(false);
  expect(Object.hasOwn(rule ?? {}, "basePath")).toBe(false);
  expect(Object.hasOwn(rule ?? {}, "locale")).toBe(false);
});
