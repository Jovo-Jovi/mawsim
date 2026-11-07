import { afterEach, beforeEach, expect, it, vi } from "vitest";

type ThemeChoice = "system" | "light" | "dark";

const theme = vi.hoisted(() => {
  let choice: ThemeChoice = "system";
  return {
    chooseTheme: vi.fn((next: ThemeChoice) => {
      choice = next;
    }),
    currentThemeChoice: vi.fn(() => choice),
    setChoice(next: ThemeChoice) {
      choice = next;
    },
  };
});

vi.mock("./theme-storage", () => ({
  chooseTheme: theme.chooseTheme,
  currentThemeChoice: theme.currentThemeChoice,
}));

type ClipCall = {
  keyframes: { clipPath?: string | string[] };
  options: { duration?: number; easing?: string; pseudoElement?: string | null };
  cancel: ReturnType<typeof vi.fn>;
};

function gate() {
  let resolve: () => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush(): Promise<void> {
  for (let step = 0; step < 8; step += 1) await Promise.resolve();
}

function button(left: number, top: number, width: number, height: number): HTMLElement {
  return {
    getBoundingClientRect() {
      return {
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON() {
          return {};
        },
      };
    },
  } as HTMLElement;
}

function mount(options?: {
  scheme?: "light" | "dark";
  reduced?: boolean;
  width?: number;
  height?: number;
  api?: boolean;
  durationToken?: string;
  easingToken?: string;
  fades?: Promise<void>[];
}) {
  const scheme = options?.scheme ?? "light";
  const reduced = options?.reduced ?? false;
  const width = options?.width ?? 800;
  const height = options?.height ?? 600;
  const events: string[] = [];
  const clips: ClipCall[] = [];
  const readies: Array<() => void> = [];
  let fadeDuringChoose: string | null = null;
  const attributes = new Map<string, string>();

  class CssTransition {
    finished: Promise<void>;
    constructor(finished: Promise<void>) {
      this.finished = finished;
    }
  }

  const root = {
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    removeAttribute(name: string) {
      attributes.delete(name);
    },
    hasAttribute(name: string) {
      return attributes.has(name);
    },
    getAttribute(name: string) {
      return attributes.has(name) ? (attributes.get(name) ?? null) : null;
    },
    animate(
      keyframes: { clipPath?: string | string[] },
      animateOptions?: { duration?: number; easing?: string; pseudoElement?: string | null },
    ) {
      const finished = gate();
      const cancel = vi.fn(() => {
        events.push("cancel");
        finished.reject(new Error("cancelled"));
      });
      clips.push({ keyframes, options: animateOptions ?? {}, cancel });
      events.push("animate");
      return { cancel, finished: finished.promise };
    },
  };

  const documentStub: {
    documentElement: typeof root;
    getAnimations: () => CssTransition[];
    startViewTransition?: (update: () => void) => {
      skipTransition: () => void;
      ready: Promise<void>;
      finished: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  } = {
    documentElement: root,
    getAnimations: () => (options?.fades ?? []).map((finished) => new CssTransition(finished)),
  };

  if (options?.api !== false) {
    documentStub.startViewTransition = (update) => {
      events.push("start");
      update();
      const ready = gate();
      const finished = gate();
      const updateCallbackDone = gate();
      readies.push(ready.resolve);
      return {
        skipTransition() {
          events.push("skip");
          ready.reject(new Error("skipped"));
          finished.reject(new Error("skipped"));
          updateCallbackDone.reject(new Error("skipped"));
        },
        ready: ready.promise,
        finished: finished.promise,
        updateCallbackDone: updateCallbackDone.promise,
      };
    };
  }

  theme.chooseTheme.mockImplementation((next: ThemeChoice) => {
    fadeDuringChoose = root.getAttribute("data-theme-fade");
    theme.setChoice(next);
  });

  vi.stubGlobal("CSSTransition", CssTransition);
  vi.stubGlobal("document", documentStub);
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue(name: string) {
      if (name === "--dur-theme") return options?.durationToken ?? "500ms";
      if (name === "--ease-in-out") return options?.easingToken ?? "cubic-bezier(0.6, 0, 0.3, 1)";
      return "";
    },
  }));
  vi.stubGlobal("window", {
    matchMedia(query: string) {
      return {
        matches:
          (query === "(prefers-color-scheme: dark)" && scheme === "dark") ||
          (query === "(prefers-reduced-motion: reduce)" && reduced),
        media: query,
      };
    },
    innerWidth: width,
    innerHeight: height,
  });

  return {
    events,
    clips,
    root,
    fadeDuringChoose: () => fadeDuringChoose,
    resolveReady() {
      const resolve = readies.at(-1);
      if (!resolve) throw new Error("no view transition is waiting");
      resolve();
    },
  };
}

async function loadReveal() {
  vi.resetModules();
  return import("./theme-reveal");
}

beforeEach(() => {
  theme.setChoice("system");
  theme.chooseTheme.mockReset();
  theme.currentThemeChoice.mockClear();
  theme.chooseTheme.mockImplementation((next: ThemeChoice) => {
    theme.setChoice(next);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  theme.setChoice("system");
});

it("a transition starts when the painted theme does not change", async () => {
  const light = mount({ scheme: "light" });
  const { revealThemeChoice } = await loadReveal();
  theme.setChoice("system");
  revealThemeChoice("light", button(0, 0, 40, 40));
  revealThemeChoice("system", button(0, 0, 40, 40));
  theme.setChoice("dark");
  revealThemeChoice("dark", button(0, 0, 40, 40));
  expect(light.events.filter((event) => event === "start")).toEqual([]);
  expect(light.events.filter((event) => event === "animate")).toEqual([]);
  expect(light.fadeDuringChoose()).toBeNull();
  expect(light.root.hasAttribute("data-theme-fade")).toBe(false);
  expect(theme.chooseTheme).toHaveBeenCalledWith("light");
  expect(theme.chooseTheme).toHaveBeenCalledWith("system");
  expect(theme.chooseTheme).toHaveBeenCalledWith("dark");

  const dark = mount({ scheme: "dark" });
  theme.setChoice("system");
  revealThemeChoice("dark", button(0, 0, 40, 40));
  revealThemeChoice("system", button(0, 0, 40, 40));
  expect(dark.events.filter((event) => event === "start")).toEqual([]);
  expect(dark.fadeDuringChoose()).toBeNull();
  expect(theme.chooseTheme).toHaveBeenCalledWith("dark");
  expect(theme.chooseTheme).toHaveBeenCalledWith("system");
});

it("a transition or the fade runs under reduced motion", async () => {
  const page = mount({ reduced: true, scheme: "light" });
  const { revealThemeChoice } = await loadReveal();
  theme.setChoice("system");
  revealThemeChoice("dark", button(0, 0, 40, 40));
  expect(theme.chooseTheme).toHaveBeenCalledWith("dark");
  expect(page.events).toEqual([]);
  expect(page.fadeDuringChoose()).toBeNull();
  expect(page.root.hasAttribute("data-theme-fade")).toBe(false);

  const faded = mount({ api: false, reduced: true, scheme: "light" });
  theme.setChoice("system");
  revealThemeChoice("dark", button(0, 0, 40, 40));
  expect(theme.chooseTheme).toHaveBeenCalledWith("dark");
  expect(faded.events).toEqual([]);
  expect(faded.fadeDuringChoose()).toBeNull();
  expect(faded.root.hasAttribute("data-theme-fade")).toBe(false);
});

it("the circle is not centred on the button, or does not reach the farthest corner", async () => {
  const page = mount({ width: 800, height: 600 });
  const { revealThemeChoice } = await loadReveal();
  const edges = [
    {
      box: [0, 200, 48, 48] as const,
      from: "circle(0px at 24px 224px)",
      to: "circle(862.2946132268252px at 24px 224px)",
    },
    {
      box: [752, 200, 48, 48] as const,
      from: "circle(0px at 776px 224px)",
      to: "circle(862.2946132268252px at 776px 224px)",
    },
    {
      box: [376, 0, 48, 48] as const,
      from: "circle(0px at 400px 24px)",
      to: "circle(701.267424025956px at 400px 24px)",
    },
    {
      box: [376, 552, 48, 48] as const,
      from: "circle(0px at 400px 576px)",
      to: "circle(701.267424025956px at 400px 576px)",
    },
  ];
  const choices: ThemeChoice[] = ["dark", "light", "dark", "light"];
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    if (!edge) continue;
    const [left, top, width, height] = edge.box;
    revealThemeChoice(choices[index] ?? "dark", button(left, top, width, height));
    page.resolveReady();
    await flush();
    expect(page.clips.at(-1)?.keyframes.clipPath).toEqual([edge.from, edge.to]);
  }
});

it("the duration or easing is not the token's", async () => {
  const page = mount({
    durationToken: "320ms",
    easingToken: "cubic-bezier(0.4, 0, 0.2, 1)",
  });
  const { revealThemeChoice } = await loadReveal();
  revealThemeChoice("dark", button(0, 0, 40, 40));
  page.resolveReady();
  await flush();
  expect(page.clips).toHaveLength(1);
  expect(page.clips[0]?.options.duration).toBe(320);
  expect(page.clips[0]?.options.easing).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
});

it("the animation targets something other than `::view-transition-new(root)`", async () => {
  const page = mount();
  const { revealThemeChoice } = await loadReveal();
  revealThemeChoice("dark", button(10, 10, 40, 40));
  page.resolveReady();
  await flush();
  expect(page.clips).toHaveLength(1);
  expect(page.clips[0]?.options.pseudoElement).toBe("::view-transition-new(root)");
});

it("a second press does not skip the running transition first", async () => {
  const page = mount();
  const { revealThemeChoice } = await loadReveal();
  revealThemeChoice("dark", button(0, 0, 40, 40));
  page.resolveReady();
  await flush();
  revealThemeChoice("light", button(0, 0, 40, 40));
  const skipAt = page.events.indexOf("skip");
  const secondStart = page.events.lastIndexOf("start");
  expect(skipAt).toBeGreaterThan(page.events.indexOf("animate"));
  expect(secondStart).toBeGreaterThan(skipAt);
});

it("a second press leaves the first clip animation running", async () => {
  const page = mount();
  const { revealThemeChoice } = await loadReveal();
  revealThemeChoice("dark", button(0, 0, 40, 40));
  page.resolveReady();
  await flush();
  const first = page.clips[0];
  revealThemeChoice("light", button(700, 0, 40, 40));
  expect(first?.cancel).toHaveBeenCalledTimes(1);
  const cancelAt = page.events.indexOf("cancel");
  expect(cancelAt).toBeGreaterThan(-1);
  expect(cancelAt).toBeLessThan(page.events.indexOf("skip"));
});

it("a skipped transition leaves a rejection unhandled", async () => {
  const reasons: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    reasons.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const page = mount();
    const { revealThemeChoice } = await loadReveal();
    revealThemeChoice("dark", button(0, 0, 40, 40));
    revealThemeChoice("light", button(0, 0, 40, 40));
    await flush();
    expect(page.events).toContain("skip");
    expect(reasons).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    process.off("unhandledRejection", onUnhandled);
    errors.mockRestore();
  }
});

it("without the API, the fade attribute is not set, or is not removed", async () => {
  const immediate = mount({ api: false });
  const { revealThemeChoice } = await loadReveal();
  theme.setChoice("system");
  revealThemeChoice("dark", button(0, 0, 40, 40));
  expect(theme.chooseTheme).toHaveBeenCalledWith("dark");
  expect(immediate.fadeDuringChoose()).toBe("");
  expect(immediate.root.hasAttribute("data-theme-fade")).toBe(false);

  const finished = gate();
  const fading = mount({ api: false, fades: [finished.promise] });
  revealThemeChoice("light", button(0, 0, 40, 40));
  expect(fading.fadeDuringChoose()).toBe("");
  expect(fading.root.hasAttribute("data-theme-fade")).toBe(true);
  finished.resolve();
  await flush();
  expect(fading.root.hasAttribute("data-theme-fade")).toBe(false);

  const cancelled = gate();
  const dropping = mount({ api: false, fades: [cancelled.promise] });
  revealThemeChoice("dark", button(0, 0, 40, 40));
  expect(dropping.root.hasAttribute("data-theme-fade")).toBe(true);
  cancelled.reject(new Error("cancelled"));
  await flush();
  expect(dropping.root.hasAttribute("data-theme-fade")).toBe(false);
});
