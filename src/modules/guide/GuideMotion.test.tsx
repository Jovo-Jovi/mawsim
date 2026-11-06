import { afterEach, beforeAll, expect, it } from "vitest";
import type { ReactElement } from "react";
import type { Root } from "react-dom/client";
import type { CalendarMonth } from "../../domain";
import { calendarMonths } from "../../domain";
import { dialTurnDegrees } from "@/modules/produce";

type GuideMotionComponent = typeof import("./GuideMotion").GuideMotion;

const preferMotion = { current: true };
let createRoot: (container: Element) => Root;
let createElement: typeof import("react").createElement;
let act: <T>(action: () => T) => T;
let gsap: typeof import("gsap").default;
let GuideMotion: GuideMotionComponent;
let active: Root | null = null;

function cssTextOf(values: Record<string, string>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value}`)
    .join("; ");
}

function createStyle(): CSSStyleDeclaration {
  const values: Record<string, string> = {};
  const style = {
    setProperty(name: string, value: string) {
      values[name] = String(value);
    },
    getPropertyValue(name: string) {
      return values[name] ?? "";
    },
    removeProperty(name: string) {
      const previous = values[name] ?? "";
      delete values[name];
      return previous;
    },
    get cssText() {
      return cssTextOf(values);
    },
    set cssText(text: string) {
      for (const key of Object.keys(values)) delete values[key];
      for (const part of String(text).split(";")) {
        const colon = part.indexOf(":");
        if (colon === -1) continue;
        values[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
      }
    },
  };
  return new Proxy(style, {
    has(target, prop) {
      return prop in target || typeof prop === "string";
    },
    get(target, prop) {
      if (prop in target) return target[prop as keyof typeof target];
      if (typeof prop !== "string") return undefined;
      return values[prop] ?? "";
    },
    set(target, prop, value) {
      if (typeof prop === "string" && !(prop in target)) values[prop] = value == null ? "" : String(value);
      else (target as Record<string, unknown>)[prop as string] = value;
      return true;
    },
  }) as unknown as CSSStyleDeclaration;
}

class DomNode {}
class DomElement extends DomNode {}
class DomText extends DomNode {}
class DomFrame extends DomElement {}

type LooseNode = {
  nodeType: number;
  nodeName: string;
  tagName?: string;
  parentNode: LooseNode | null;
  childNodes: LooseNode[];
  ownerDocument: LooseNode | null;
  attributes: Map<string, string>;
  dataset: Record<string, string | undefined>;
  textContent: string;
  style?: CSSStyleDeclaration;
  namespaceURI: string;
  listeners: Map<string, ((event: Event) => void)[]>;
  appendChild: (child: LooseNode) => LooseNode;
  insertBefore: (child: LooseNode, before: LooseNode | null) => LooseNode;
  removeChild: (child: LooseNode) => LooseNode;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  removeAttribute: (name: string) => void;
  hasAttribute: (name: string) => boolean;
  querySelector: (selector: string) => LooseNode | null;
  querySelectorAll: (selector: string) => LooseNode[];
  closest: (selector: string) => LooseNode | null;
  contains: (other: LooseNode | null) => boolean;
  dispatchEvent: (event: Event) => boolean;
  addEventListener: (type: string, fn: EventListener) => void;
  removeEventListener: (type: string, fn: EventListener) => void;
  getBoundingClientRect: () => DOMRect;
  focus: () => void;
  blur: () => void;
  remove: () => void;
  cloneNode: () => LooseNode;
  getRootNode: () => LooseNode | null;
};

type LooseDocument = LooseNode & {
  documentElement: LooseNode;
  body: LooseNode;
  head: LooseNode;
  defaultView: unknown;
  createElement: (name: string) => LooseNode;
  createElementNS: (ns: string, name: string) => LooseNode;
  createTextNode: (text: string) => LooseNode;
  createComment: (text: string) => LooseNode;
  createDocumentFragment: () => LooseNode;
};

function matches(element: LooseNode, selector: string): boolean {
  if (element.nodeType !== 1) return false;
  const notAt = selector.indexOf(":not(");
  if (notAt !== -1) {
    const base = selector.slice(0, notAt);
    const excluded = selector.slice(notAt + 5, selector.indexOf(")", notAt));
    if (matches(element, excluded)) return false;
    return base.length === 0 || matches(element, base);
  }
  if (selector.startsWith("[") && selector.endsWith("]")) {
    const body = selector.slice(1, -1);
    if (!body.includes("=")) return element.attributes.has(body);
    const [name, raw] = body.split("=");
    return element.attributes.get(name ?? "") === (raw ?? "").replaceAll('"', "");
  }
  return element.nodeName.toLowerCase() === selector.toLowerCase();
}

function createNode(kind: number, name: string): LooseNode {
  const node = Object.create(kind === 1 ? DomElement.prototype : kind === 3 ? DomText.prototype : DomNode.prototype) as LooseNode;
  node.nodeType = kind;
  node.nodeName = name;
  if (kind === 1) node.tagName = name;
  node.parentNode = null;
  node.childNodes = [];
  node.ownerDocument = null;
  node.attributes = new Map();
  node.dataset = {};
  node.textContent = "";
  node.namespaceURI = "http://www.w3.org/1999/xhtml";
  node.listeners = new Map();
  if (kind === 1) node.style = createStyle();
  const api = node;
  Object.defineProperty(api, "firstChild", { get: () => node.childNodes[0] ?? null });
  Object.defineProperty(api, "lastChild", { get: () => node.childNodes.at(-1) ?? null });
  Object.defineProperty(api, "nextSibling", {
    get: () => {
      if (!node.parentNode) return null;
      const index = node.parentNode.childNodes.indexOf(node);
      return node.parentNode.childNodes[index + 1] ?? null;
    },
  });
  Object.defineProperty(api, "previousSibling", {
    get: () => {
      if (!node.parentNode) return null;
      const index = node.parentNode.childNodes.indexOf(node);
      return node.parentNode.childNodes[index - 1] ?? null;
    },
  });
  Object.defineProperty(api, "parentElement", {
    get: () => (node.parentNode && node.parentNode.nodeType === 1 ? node.parentNode : null),
  });
  Object.defineProperty(api, "children", {
    get: () => node.childNodes.filter((child) => child.nodeType === 1),
  });
  Object.defineProperty(api, "className", {
    get: () => node.attributes.get("class") ?? "",
    set: (value: string) => node.attributes.set("class", value),
  });
  Object.defineProperty(api, "hidden", {
    get: () => node.attributes.has("hidden"),
    set: (value: boolean) => {
      if (value) node.attributes.set("hidden", "");
      else node.attributes.delete("hidden");
    },
  });
  api.appendChild = (child) => {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = node;
    node.childNodes.push(child);
    return child;
  };
  api.insertBefore = (child, before) => {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = node;
    const index = before ? node.childNodes.indexOf(before) : node.childNodes.length;
    node.childNodes.splice(index < 0 ? node.childNodes.length : index, 0, child);
    return child;
  };
  api.removeChild = (child) => {
    const index = node.childNodes.indexOf(child);
    if (index >= 0) node.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  };
  api.setAttribute = (attr: string, value: string) => node.attributes.set(attr, String(value));
  api.getAttribute = (attr: string) => (node.attributes.has(attr) ? (node.attributes.get(attr) ?? "") : null);
  api.removeAttribute = (attr: string) => node.attributes.delete(attr);
  api.hasAttribute = (attr: string) => node.attributes.has(attr);
  api.addEventListener = (type: string, fn: EventListener) => {
    const list = node.listeners.get(type) ?? [];
    list.push(fn as (event: Event) => void);
    node.listeners.set(type, list);
  };
  api.removeEventListener = (type: string, fn: EventListener) => {
    node.listeners.set(
      type,
      (node.listeners.get(type) ?? []).filter((item) => item !== fn),
    );
  };
  api.dispatchEvent = (event) => {
    let current: LooseNode | null = node;
    while (current) {
      for (const fn of current.listeners.get(event.type) ?? []) fn(event);
      current = current.parentNode;
    }
    return true;
  };
  api.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
  api.contains = (other) => {
    let current = other;
    while (current) {
      if (current === node) return true;
      current = current.parentNode;
    }
    return false;
  };
  api.querySelectorAll = (selector) => {
    const found: LooseNode[] = [];
    const walk = (current: LooseNode) => {
      if (current !== node && matches(current, selector)) found.push(current);
      for (const child of current.childNodes) if (child.nodeType === 1) walk(child);
    };
    walk(node);
    return found;
  };
  api.querySelector = (selector) => api.querySelectorAll(selector)[0] ?? null;
  api.closest = (selector) => {
    let current: LooseNode | null = node;
    while (current) {
      if (matches(current, selector)) return current;
      current = current.parentNode;
    }
    return null;
  };
  api.getRootNode = () => node.ownerDocument;
  api.cloneNode = () => createNode(kind, name);
  api.focus = () => {};
  api.blur = () => {};
  api.remove = () => {
    if (node.parentNode) node.parentNode.removeChild(node);
  };
  return node;
}

function installDom(): void {
  const documentNode = createNode(9, "#document");
  const documentElement = createNode(1, "HTML");
  const body = createNode(1, "BODY");
  const head = createNode(1, "HEAD");
  const documentRecord = documentNode as LooseDocument;
  documentRecord.appendChild(documentElement);
  documentElement.appendChild(body);
  documentElement.appendChild(head);
  const adopt = (node: LooseNode) => {
    node.ownerDocument = documentNode;
  };
  adopt(documentElement);
  adopt(body);
  adopt(head);
  documentRecord.documentElement = documentElement;
  documentRecord.body = body;
  documentRecord.head = head;
  documentRecord.createElement = (name: string) => {
    const element = createNode(1, String(name).toUpperCase());
    adopt(element);
    return element;
  };
  documentRecord.createElementNS = (_ns: string, name: string) => documentRecord.createElement(name);
  documentRecord.createTextNode = (text: string) => {
    const node = createNode(3, "#text");
    node.textContent = String(text);
    adopt(node);
    return node;
  };
  documentRecord.createComment = (text: string) => {
    const node = createNode(8, "#comment");
    node.textContent = String(text);
    adopt(node);
    return node;
  };
  documentRecord.createDocumentFragment = () => {
    const node = createNode(11, "#fragment");
    adopt(node);
    return node;
  };
  const windowRecord = {
    document: documentRecord,
    Element: DomElement,
    HTMLElement: DomElement,
    HTMLIFrameElement: DomFrame,
    SVGElement: class extends DomElement {},
    Node: DomNode,
    getComputedStyle(element: LooseNode) {
      const inline = element?.style;
      return new Proxy(
        {
          getPropertyValue(name: string) {
            const own = inline?.getPropertyValue(name) ?? "";
            if (own) return own;
            if (name === "display") return element?.attributes?.has("hidden") ? "none" : "block";
            if (name === "opacity") return "1";
            if (name === "position") return "static";
            if (name === "transform") return "none";
            return "";
          },
        },
        {
          get(target, prop) {
            if (prop in target) return target[prop as keyof typeof target];
            if (typeof prop !== "string") return undefined;
            return target.getPropertyValue(prop);
          },
        },
      );
    },
    matchMedia(query: string) {
      const matches = query.includes("no-preference") ? preferMotion.current : !preferMotion.current;
      return {
        matches,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      };
    },
    requestAnimationFrame(callback: (time: number) => void) {
      return setTimeout(() => callback(Date.now()), 0) as unknown as number;
    },
    cancelAnimationFrame(id: number) {
      clearTimeout(id);
    },
    getSelection: () => null,
    scrollX: 0,
    scrollY: 0,
    pageXOffset: 0,
    pageYOffset: 0,
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    window: undefined as unknown,
    self: undefined as unknown,
  };
  windowRecord.window = windowRecord;
  windowRecord.self = windowRecord;
  documentRecord.defaultView = windowRecord;
  const rootStyle = documentElement.style;
  rootStyle?.setProperty("--dur-3", "420ms");
  rootStyle?.setProperty("--dur-flip", "560ms");
  rootStyle?.setProperty("--flip-stagger", "40ms");
  rootStyle?.setProperty("--reveal-rise", "1rem");
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.window = windowRecord;
  globals.document = documentRecord;
  globals.Element = DomElement;
  globals.HTMLElement = DomElement;
  globals.HTMLIFrameElement = DomFrame;
  globals.SVGElement = windowRecord.SVGElement;
  globals.Node = DomNode;
  globals.getComputedStyle = windowRecord.getComputedStyle;
  globals.requestAnimationFrame = windowRecord.requestAnimationFrame;
  globals.cancelAnimationFrame = windowRecord.cancelAnimationFrame;
  globals.matchMedia = windowRecord.matchMedia;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
}

function scene(): ReactElement {
  return createElement(
    "nav",
    { "data-month-picker": "" },
    createElement(
      "div",
      { "data-dial-turn": "" },
      createElement("a", { "data-month": "9", href: "/en/guide?month=9" }, "Sep"),
      createElement("span", { "data-dial-label": "" }, "Sep"),
    ),
  );
}

function guideTree(selectedMonth: CalendarMonth, direction: "ltr" | "rtl") {
  const turnDegrees = calendarMonths.map((month) => dialTurnDegrees(month, direction));
  return createElement(GuideMotion, { selectedMonth, direction, turnDegrees, children: scene() });
}

async function renderAt(selectedMonth: CalendarMonth, direction: "ltr" | "rtl" = "ltr"): Promise<Element> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  active = createRoot(host);
  await act(async () => {
    active?.render(guideTree(selectedMonth, direction));
  });
  return host;
}

function turnOf(host: Element): Element {
  const turn = host.querySelector("[data-dial-turn]");
  if (!turn) throw new Error("missing dial turn");
  return turn;
}

beforeAll(async () => {
  installDom();
  ({ createRoot } = await import("react-dom/client"));
  const react = await import("react");
  createElement = react.createElement as typeof createElement;
  act = react.act as typeof act;
  gsap = (await import("gsap")).default;
  ({ GuideMotion } = await import("./GuideMotion"));
});

afterEach(async () => {
  await act(async () => {
    active?.unmount();
  });
  active = null;
  gsap.globalTimeline.clear();
  document.body.textContent = "";
  preferMotion.current = true;
});

it("plays the dial on the first paint, or leaves a rotation before the month changes", async () => {
  const host = await renderAt(8);
  const turn = turnOf(host);
  expect(gsap.getTweensOf(turn)).toHaveLength(0);
  expect(turn.getAttribute("style") ?? "").not.toContain("rotate");
});

it("skips the short-way turn after the month changes, or plays that turn twice", async () => {
  const host = await renderAt(8);
  await act(async () => {
    active?.render(guideTree(9, "ltr"));
  });
  const turn = turnOf(host);
  const label = host.querySelector("[data-dial-label]");
  if (!label) throw new Error("missing dial label");
  expect(gsap.getTweensOf(turn)).toHaveLength(1);
  expect(Number(gsap.getProperty(turn, "rotation"))).toBeCloseTo(30, 2);
  expect(Number(gsap.getProperty(label, "rotation"))).toBeCloseTo(-30, 2);
  await act(async () => {
    active?.render(guideTree(9, "ltr"));
  });
  expect(gsap.getTweensOf(turn)).toHaveLength(1);
});

it("turns August toward September the long way, or keeps the ltr sign in rtl", async () => {
  const host = await renderAt(8, "rtl");
  await act(async () => {
    active?.render(guideTree(9, "rtl"));
  });
  expect(Number(gsap.getProperty(turnOf(host), "rotation"))).toBeCloseTo(-30, 2);
});

it("turns the dial when the visitor asks for reduced motion", async () => {
  preferMotion.current = false;
  const host = await renderAt(8);
  await act(async () => {
    active?.render(guideTree(9, "ltr"));
  });
  const turn = turnOf(host);
  expect(gsap.getTweensOf(turn)).toHaveLength(0);
  expect(turn.getAttribute("style") ?? "").not.toMatch(/rotate|opacity|will-change/);
});

it("leaves a rotation, opacity or will-change after the guide unmounts", async () => {
  const host = await renderAt(8);
  await act(async () => {
    active?.render(guideTree(9, "ltr"));
  });
  const turn = turnOf(host);
  expect(Number(gsap.getProperty(turn, "rotation"))).toBeCloseTo(30, 2);
  await act(async () => {
    active?.unmount();
  });
  active = null;
  const style = turn.getAttribute("style") ?? "";
  expect(style).not.toMatch(/rotate|opacity|will-change/);
});
