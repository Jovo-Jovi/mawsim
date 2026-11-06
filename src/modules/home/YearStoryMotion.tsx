"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import styles from "./YearStoryMotion.module.css";

gsap.registerPlugin(ScrollTrigger);

const storySteps = 11;

function customProperty(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function secondsOf(raw: string): number {
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount)) return Number.NaN;
  if (raw.endsWith("ms")) return amount * 1e-3;
  return amount;
}

function monthFromHref(href: string): number {
  const match = /[?&]month=(\d+)/.exec(href);
  const month = match === null ? Number.NaN : Number(match[1]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return Number.NaN;
  return month;
}

function monthAfter(start: number, offset: number): number {
  return ((start - 1 + offset) % 12) + 1;
}

function clearPaint(node: Element): void {
  if (!(node instanceof HTMLElement)) return;
  node.style.transform = "";
  node.style.rotate = "";
  node.style.scale = "";
  node.style.opacity = "";
  node.style.willChange = "";
}

export function YearStoryMotion({
  dialTurnDegrees,
  guideHrefs,
  seasonMonths,
  children,
}: {
  dialTurnDegrees: readonly number[];
  guideHrefs: readonly string[];
  seasonMonths: readonly (readonly number[])[];
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const turnKey = dialTurnDegrees.join(",");
  const hrefKey = guideHrefs.join("|");
  const seasonKey = seasonMonths.map((row) => row.join(".")).join("|");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const turns = turnKey.split(",").map(Number);
    const hrefs = hrefKey.split("|");
    const seasonRows = seasonKey.split("|").map((row) => (row.length === 0 ? [] : row.split(".").map(Number)));
    const stepTurn = (turns[1] ?? Number.NaN) - (turns[0] ?? Number.NaN);
    const band = root.querySelector("[data-texture-band='hero']");
    const turn = root.querySelector("[data-dial-turn]");
    const labels = [...root.querySelectorAll("[data-dial-label]")];
    const circles = [...root.querySelectorAll("[data-story-produce]")];
    const monthSlots = [...root.querySelectorAll("[data-story-slot='month']")];
    const countSlots = [...root.querySelectorAll("[data-story-slot='count']")];
    const link = root.querySelector("a[href*='guide?month=']");
    const slots = [...monthSlots, ...countSlots];
    if (!(band instanceof HTMLElement) || !(turn instanceof HTMLElement) || !(link instanceof HTMLAnchorElement)) return;
    if (!Number.isFinite(stepTurn) || stepTurn === 0 || labels.length !== 12 || circles.length !== seasonRows.length) return;
    if (hrefs.length !== 12 || monthSlots.length !== 12 || countSlots.length !== 12) return;

    const initialMonth = monthFromHref(link.getAttribute("href") ?? "");
    if (!Number.isInteger(initialMonth)) return;
    const initialHref = link.getAttribute("href");
    const initialHidden = slots.map((slot) => slot.getAttribute("aria-hidden"));
    const painted = [turn, ...labels, ...circles, ...slots];

    const restoreSlots = () => {
      slots.forEach((slot, index) => {
        const hidden = initialHidden[index];
        if (hidden === undefined || hidden === null) slot.removeAttribute("aria-hidden");
        else slot.setAttribute("aria-hidden", hidden);
      });
      if (initialHref === null) link.removeAttribute("href");
      else link.setAttribute("href", initialHref);
    };

    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;
    let timeline: gsap.core.Timeline | null = null;

    const release = () => {
      timeline?.scrollTrigger?.kill();
      timeline?.kill();
      timeline = null;
      lenis?.destroy();
      lenis = null;
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      gsap.ticker.lagSmoothing(500, 33);
      restoreSlots();
      for (const node of painted) clearPaint(node);
      for (const className of [...document.documentElement.classList]) {
        if (className === "lenis" || className.startsWith("lenis-")) document.documentElement.classList.remove(className);
      }
    };

    const ctx = gsap.context(() => {
      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        const scrub = secondsOf(customProperty("--story-scrub"));
        const backScale = Number.parseFloat(customProperty("--story-back-scale"));
        const backOpacity = Number.parseFloat(customProperty("--story-back-opacity"));
        if (!Number.isFinite(scrub) || !Number.isFinite(backScale) || !Number.isFinite(backOpacity)) return;

        const showMonth = () => {
          if (!timeline) return;
          const offset = Math.min(storySteps, Math.max(0, Math.round(timeline.time())));
          const shown = monthAfter(initialMonth, offset);
          for (const slot of slots) {
            const on = Number(slot.getAttribute("data-story-month")) === shown;
            if (on) slot.removeAttribute("aria-hidden");
            else slot.setAttribute("aria-hidden", "true");
          }
          const nextHref = hrefs[shown - 1];
          if (nextHref) link.setAttribute("href", nextHref);
        };

        timeline = gsap.timeline({
          defaults: { ease: "none", duration: 1 },
          onUpdate: showMonth,
          scrollTrigger: {
            trigger: band,
            start: "top top",
            end: "bottom bottom",
            scrub,
          },
        });
        timeline.to(turn, { rotation: stepTurn * storySteps, duration: storySteps }, 0);
        timeline.to(labels, { rotation: -stepTurn * storySteps, duration: storySteps }, 0);

        for (let step = 1; step <= storySteps; step += 1) {
          const shown = monthAfter(initialMonth, step);
          const previous = monthAfter(initialMonth, step - 1);
          circles.forEach((circle, index) => {
            const forward = (seasonRows[index] ?? []).includes(shown);
            timeline?.to(
              circle,
              { scale: forward ? 1 : backScale, opacity: forward ? 1 : backOpacity },
              step - 1,
            );
          });
          for (const group of [monthSlots, countSlots]) {
            const enter = group.find((slot) => Number(slot.getAttribute("data-story-month")) === shown);
            const leave = group.find((slot) => Number(slot.getAttribute("data-story-month")) === previous);
            if (enter) timeline?.to(enter, { opacity: 1 }, step - 1);
            if (leave && leave !== enter) timeline?.to(leave, { opacity: 0 }, step - 1);
          }
        }
        showMonth();

        lenis = new Lenis({ autoRaf: false, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        tick = (time: number) => {
          lenis?.raf(time * 1000);
        };
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        return () => {
          release();
        };
      });
    }, root);

    return () => {
      ctx.revert();
      release();
    };
  }, [hrefKey, seasonKey, turnKey]);

  return (
    <div ref={rootRef} className={styles.motion}>
      {children}
    </div>
  );
}
