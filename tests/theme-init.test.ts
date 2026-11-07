import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";
import { expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "../src/components/theme/theme-storage";

const source = readFileSync(new URL("../public/theme-init.js", import.meta.url), "utf8");
const refused = ["fetch", "XMLHttpRequest", "sendBeacon", "cookie", "sessionStorage", "indexedDB", "http", "import"];

function run(stored: string | null, failing: "none" | "getItem" | "getter"): string | null {
  const element = {
    theme: null as string | null,
    setAttribute(name: string, value: string) {
      if (name === "data-theme") this.theme = value;
    },
  };
  const sandbox: Record<string, unknown> = {
    document: { documentElement: element },
  };
  if (failing !== "getter") {
    sandbox.localStorage = {
      getItem(key: string) {
        if (failing === "getItem") throw new Error("blocked");
        return key === THEME_STORAGE_KEY ? stored : null;
      },
    };
  }
  const context = createContext(sandbox);
  if (failing === "getter") {
    // A getter set on the sandbox before createContext is not the script's localStorage binding.
    new Script(
      'Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });',
    ).runInContext(context);
  }
  const before = new Set(Object.getOwnPropertyNames(sandbox));
  expect(() => new Script(source).runInContext(context)).not.toThrow();
  const gained = Object.getOwnPropertyNames(sandbox).filter((key) => !before.has(key));
  expect(gained).toEqual([]);
  return element.theme;
}

it("names another store, a request, or a global in the pre-paint script", () => {
  expect(source).toContain(THEME_STORAGE_KEY);
  for (const word of refused) expect(source.includes(word), word).toBe(false);
});

it("does not set data-theme when light is stored", () => {
  expect(run("light", "none")).toBe("light");
});

it("does not set data-theme when dark is stored", () => {
  expect(run("dark", "none")).toBe("dark");
});

it("sets data-theme when system is stored", () => {
  expect(run("system", "none")).toBeNull();
});

it("sets data-theme when the stored value is bogus", () => {
  expect(run("bogus", "none")).toBeNull();
});

it("sets data-theme when nothing is stored", () => {
  expect(run(null, "none")).toBeNull();
});

it("throws when getItem throws", () => {
  expect(run(null, "getItem")).toBeNull();
});

it("throws when the localStorage getter throws", () => {
  expect(run(null, "getter")).toBeNull();
});
