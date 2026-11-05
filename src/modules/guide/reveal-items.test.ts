import { expect, it } from "vitest";
import { revealItems, type RevealObserver, type RevealTarget } from "./reveal-items";

const VIEWPORT = 800;

type Stub = RevealTarget & {
  observes: number;
  releases: number;
  writes: number;
};

function stub(top: number, reveal: string | null = null): Stub {
  const attrs = new Map<string, string>();
  if (reveal !== null) attrs.set("data-reveal", reveal);
  const box: Stub = {
    observes: 0,
    releases: 0,
    writes: 0,
    getAttribute(name) {
      return attrs.get(name) ?? null;
    },
    setAttribute(name, value) {
      attrs.set(name, value);
      box.writes += 1;
    },
    getBoundingClientRect() {
      return { top };
    },
  };
  return box;
}

function rootOf(targets: readonly Stub[]) {
  return {
    querySelectorAll(selector: string) {
      if (selector !== "[data-reveal-item]") return [];
      return targets;
    },
  };
}

function factoryFor(targets: readonly Stub[]) {
  const observed: RevealTarget[] = [];
  let onEnter: (target: RevealTarget) => void = () => {};
  let created = 0;
  const observer: RevealObserver & {
    disconnected: boolean;
    fire(target: RevealTarget): void;
  } = {
    disconnected: false,
    observe(target) {
      observed.push(target);
      const found = targets.find((candidate) => candidate === target);
      if (found) found.observes += 1;
    },
    unobserve(target) {
      const index = observed.indexOf(target);
      if (index >= 0) observed.splice(index, 1);
      const found = targets.find((candidate) => candidate === target);
      if (found) found.releases += 1;
    },
    disconnect() {
      observer.disconnected = true;
    },
    fire(target) {
      onEnter(target);
    },
  };
  return {
    observer,
    create(enter: (target: RevealTarget) => void) {
      created += 1;
      onEnter = enter;
      return observer;
    },
    created: () => created,
  };
}

it("marks a card whose top is already inside the first viewport", () => {
  const inside = stub(0);
  const atEdge = stub(VIEWPORT - 1);
  const made = factoryFor([inside, atEdge]);
  const stop = revealItems(rootOf([inside, atEdge]), VIEWPORT, false, made.create);
  expect(inside.getAttribute("data-reveal")).toBeNull();
  expect(atEdge.getAttribute("data-reveal")).toBeNull();
  expect(inside.writes).toBe(0);
  expect(atEdge.writes).toBe(0);
  expect(made.created()).toBe(0);
  stop();
  expect(made.observer.disconnected).toBe(false);
});

it("leaves a below-fold card unmarked, or changes it again after it is shown", () => {
  const below = stub(VIEWPORT);
  const made = factoryFor([below]);
  revealItems(rootOf([below]), VIEWPORT, false, made.create);
  expect(below.getAttribute("data-reveal")).toBe("pending");
  expect(below.observes).toBe(1);
  made.observer.fire(below);
  expect(below.getAttribute("data-reveal")).toBe("shown");
  expect(below.releases).toBe(1);
  const writes = below.writes;
  made.observer.fire(below);
  expect(below.getAttribute("data-reveal")).toBe("shown");
  expect(below.writes).toBe(writes);
});

it("treats a card below the first screenful as on screen because the page is scrolled", () => {
  const below = stub(20);
  const made = factoryFor([below]);
  revealItems(rootOf([below]), VIEWPORT, false, made.create, VIEWPORT);
  expect(below.getAttribute("data-reveal")).toBe("pending");
  expect(below.observes).toBe(1);
});

it("hides a card when the visitor asked for reduced motion", () => {
  const below = stub(VIEWPORT + 40);
  const made = factoryFor([below]);
  revealItems(rootOf([below]), VIEWPORT, true, made.create);
  expect(below.getAttribute("data-reveal")).toBeNull();
  expect(below.writes).toBe(0);
  expect(made.created()).toBe(0);
});

it("hides a card when the browser has no IntersectionObserver", () => {
  const below = stub(VIEWPORT + 40);
  revealItems(rootOf([below]), VIEWPORT, false, undefined);
  expect(below.getAttribute("data-reveal")).toBeNull();
  expect(below.writes).toBe(0);
  revealItems(rootOf([below]), VIEWPORT, false, null);
  expect(below.getAttribute("data-reveal")).toBeNull();
  expect(below.writes).toBe(0);
});

it("hides a shown card again, or drops a card that is still pending", () => {
  const shown = stub(VIEWPORT + 10);
  const pending = stub(VIEWPORT + 80);
  const first = factoryFor([shown, pending]);
  const stop = revealItems(rootOf([shown, pending]), VIEWPORT, false, first.create);
  first.observer.fire(shown);
  expect(shown.getAttribute("data-reveal")).toBe("shown");
  expect(pending.getAttribute("data-reveal")).toBe("pending");
  const shownWrites = shown.writes;
  stop();
  expect(first.observer.disconnected).toBe(true);

  const second = factoryFor([shown, pending]);
  revealItems(rootOf([shown, pending]), VIEWPORT, false, second.create);
  expect(shown.getAttribute("data-reveal")).toBe("shown");
  expect(shown.writes).toBe(shownWrites);
  expect(shown.observes).toBe(1);
  expect(pending.getAttribute("data-reveal")).toBe("pending");
  expect(pending.observes).toBe(2);
});
