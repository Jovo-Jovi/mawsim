"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import Flip from "gsap/Flip";
import type { CalendarMonth } from "../../domain";
import { dialTurnOffset } from "./dial-turn";
import styles from "./GuideMotion.module.css";

gsap.registerPlugin(Flip);

/** Stands for --ease-in-out. GSAP core cannot parse cubic-bezier(). */
const easeInOut = "power2.inOut";

const enteringStaggerCap = 8;

function customProperty(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function secondsOf(raw: string): number {
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount)) return Number.NaN;
  if (raw.endsWith("ms")) return amount * 1e-3;
  return amount;
}

function clickedElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function plainPickerClick(event: MouseEvent, root: HTMLElement): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const origin = clickedElement(event.target);
  if (!origin || !root.contains(origin)) return false;
  const link = origin.closest("a");
  if (!link || !root.contains(link)) return false;
  const picker = link.closest("[data-month-picker]");
  if (!picker || !root.contains(picker)) return false;
  return link.hasAttribute("data-month") || link.hasAttribute("data-month-step");
}

function turnDial(
  root: HTMLElement,
  previous: CalendarMonth,
  selected: CalendarMonth,
  direction: "ltr" | "rtl",
  turnDegrees: readonly number[],
  duration: number,
): void {
  const offset = dialTurnOffset(previous, selected, direction, (month) => turnDegrees[month - 1] ?? Number.NaN);
  const turn = root.querySelector("[data-dial-turn]");
  const labels = root.querySelectorAll("[data-dial-label]");
  // clearProps drops the inline transform when the turn reaches 0, so a settled dial matches the stylesheet.
  if (turn) {
    gsap.fromTo(turn, { rotation: offset }, { rotation: 0, duration, ease: easeInOut, clearProps: "transform" });
  }
  if (labels.length > 0) {
    gsap.fromTo(labels, { rotation: -offset }, { rotation: 0, duration, ease: easeInOut, clearProps: "transform" });
  }
}

function riseIn(elements: Element[], duration: number, stagger: number, rise: string) {
  if (elements.length === 0) return;
  // The card's own arrival animation writes transform, which would hide this rise.
  // Set through GSAP so a context revert removes the inline value with the tween.
  gsap.set(elements, { animation: "none" });
  return gsap.fromTo(
    elements,
    { opacity: 0, y: rise },
    {
      opacity: 1,
      y: 0,
      duration,
      ease: easeInOut,
      stagger: (index: number) => {
        const place = index < enteringStaggerCap ? index : enteringStaggerCap - 1;
        return place * stagger;
      },
      onComplete: () => {
        gsap.set(elements, { clearProps: "animation" });
      },
      onInterrupt: () => {
        gsap.set(elements, { clearProps: "animation" });
      },
    },
  );
}

function resortCards(
  root: HTMLElement,
  state: ReturnType<typeof Flip.getState>,
  duration: number,
  stagger: number,
  rise: string,
): void {
  // Flip 3.15 calls onEnter only when the captured state marks the element invisible.
  // A card that was `hidden` is absent from that state, so the rise is started here too.
  const captured = new Set<Element>(state.targets);
  const risen = new Set<Element>();
  const riseOnce = (elements: Element[]) => {
    const fresh = elements.filter((element) => !risen.has(element));
    for (const element of fresh) risen.add(element);
    return riseIn(fresh, duration, stagger, rise);
  };
  Flip.from(state, {
    absolute: true,
    absoluteOnLeave: true,
    scale: true,
    duration,
    ease: easeInOut,
    targets: root.querySelectorAll("[data-flip-id]"),
    onEnter: (elements) => riseOnce(elements),
    onLeave: (elements) => gsap.fromTo(elements, { opacity: 1 }, { opacity: 0, duration, ease: easeInOut }),
  });
  riseOnce(
    [...root.querySelectorAll("[data-flip-id]:not([hidden])")].filter(
      (element) => !captured.has(element) && !risen.has(element),
    ),
  );
}

export function GuideMotion({
  selectedMonth,
  direction,
  turnDegrees,
  children,
}: {
  selectedMonth: CalendarMonth;
  direction: "ltr" | "rtl";
  /** `dialTurnDegrees` for this direction, one value per calendar month, from the server. */
  turnDegrees: readonly number[];
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef(selectedMonth);
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const turnKey = turnDegrees.join(",");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const remember = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const cards = root.querySelectorAll("[data-flip-id]:not([hidden])");
      if (cards.length === 0) return;
      flipState.current = Flip.getState(cards);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!plainPickerClick(event, root)) return;
      remember();
    };
    const onClick = (event: MouseEvent) => {
      if (!plainPickerClick(event, root)) return;
      if (flipState.current) return;
      remember();
    };
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("click", onClick);
    };
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const previous = monthRef.current;
    if (previous === selectedMonth) return;
    const captured = flipState.current;
    let cleaned = false;
    const ctx = gsap.context(() => {
      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        const turnDuration = secondsOf(customProperty("--dur-3"));
        const flipDuration = secondsOf(customProperty("--dur-flip"));
        const stagger = secondsOf(customProperty("--flip-stagger"));
        const rise = customProperty("--reveal-rise");
        const degrees = turnKey.split(",").map(Number);
        if (Number.isFinite(turnDuration)) turnDial(root, previous, selectedMonth, direction, degrees, turnDuration);
        if (captured && Number.isFinite(flipDuration) && Number.isFinite(stagger) && rise.length > 0) {
          resortCards(root, captured, flipDuration, stagger, rise);
        }
      });
    }, root);
    queueMicrotask(() => {
      if (cleaned) return;
      monthRef.current = selectedMonth;
      if (flipState.current === captured) flipState.current = null;
    });
    return () => {
      cleaned = true;
      ctx.revert();
      // Revert can leave Flip's inline transform on a card when a second month arrives mid-turn.
      for (const node of root.querySelectorAll("[data-dial-turn], [data-dial-label], [data-flip-id]")) {
        if (!(node instanceof HTMLElement)) continue;
        node.style.animation = "";
        node.style.transform = "";
        node.style.opacity = "";
        node.style.willChange = "";
      }
    };
  }, [direction, selectedMonth, turnKey]);

  return (
    <div ref={rootRef} className={styles.motion}>
      {children}
    </div>
  );
}
