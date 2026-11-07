import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, "localStorage");
  Reflect.deleteProperty(globalThis, "document");
  vi.resetModules();
});

function installDocument(): { theme: string | null } {
  const element = {
    theme: null as string | null,
    setAttribute(name: string, value: string) {
      if (name === "data-theme") this.theme = value;
    },
    removeAttribute(name: string) {
      if (name === "data-theme") this.theme = null;
    },
  };
  vi.stubGlobal("document", { documentElement: element });
  return element;
}

async function loadTheme() {
  vi.resetModules();
  return import("./theme-storage");
}

it("reads a junk or missing stored value as something other than system", async () => {
  const samples: unknown[] = [null, undefined, "", "bogus", "Light", "auto", 0, " light"];
  for (const stored of samples) {
    vi.stubGlobal("localStorage", {
      getItem: () => stored,
      setItem: () => undefined,
    });
    const theme = await loadTheme();
    expect(theme.parseThemeChoice(stored)).toBe("system");
    expect(theme.currentThemeChoice()).toBe("system");
  }

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === "mawsim-theme" ? "dark" : null),
    setItem: () => undefined,
  });
  const known = await loadTheme();
  expect(known.parseThemeChoice("light")).toBe("light");
  expect(known.parseThemeChoice("dark")).toBe("dark");
  expect(known.parseThemeChoice("system")).toBe("system");
  expect(known.currentThemeChoice()).toBe("dark");
});

it("lets a throwing getItem or setItem escape", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("getItem blocked");
    },
    setItem: () => {
      throw new Error("setItem blocked");
    },
  });
  installDocument();
  const theme = await loadTheme();
  expect(theme.currentThemeChoice()).toBe("system");
  expect(() => theme.chooseTheme("dark")).not.toThrow();
});

it("lets a throwing localStorage getter escape", async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("blocked");
    },
  });
  installDocument();
  const theme = await loadTheme();
  expect(theme.currentThemeChoice()).toBe("system");
  expect(() => theme.chooseTheme("light")).not.toThrow();
});

it("loses the choice when saving throws", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  installDocument();
  const theme = await loadTheme();
  theme.chooseTheme("dark");
  expect(theme.currentThemeChoice()).toBe("dark");
  theme.chooseTheme("system");
  expect(theme.currentThemeChoice()).toBe("system");
});

it("does not set or remove data-theme", async () => {
  const writes: [string, string][] = [];
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: (key: string, value: string) => {
      writes.push([key, value]);
    },
  });
  const element = installDocument();
  const theme = await loadTheme();
  theme.chooseTheme("dark");
  expect(element.theme).toBe("dark");
  expect(writes).toEqual([["mawsim-theme", "dark"]]);
  theme.chooseTheme("light");
  expect(element.theme).toBe("light");
  expect(writes).toEqual([
    ["mawsim-theme", "dark"],
    ["mawsim-theme", "light"],
  ]);
  theme.chooseTheme("system");
  expect(element.theme).toBeNull();
});

it("does not call a listener", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => undefined,
  });
  installDocument();
  const theme = await loadTheme();
  const seen: string[] = [];
  const stop = theme.subscribeThemeChoice((choice) => {
    seen.push(choice);
  });
  theme.chooseTheme("dark");
  expect(seen).toEqual(["dark"]);
  stop();
  theme.chooseTheme("light");
  expect(seen).toEqual(["dark"]);
});

it("reads storage again after the first look", async () => {
  let stored: string | null = "dark";
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  });
  const theme = await loadTheme();
  expect(theme.currentThemeChoice()).toBe("dark");
  stored = "light";
  expect(theme.currentThemeChoice()).toBe("dark");
});
