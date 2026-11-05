"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { revealItems, type RevealObserver, type RevealTarget } from "./reveal-items";
import styles from "./Reveal.module.css";

function watchViewport(onEnter: (target: RevealTarget) => void): RevealObserver {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const box = entry.boundingClientRect;
      const limit = entry.rootBounds?.height ?? window.innerHeight;
      // A card with no box yet sits at the origin and looks intersecting.
      if (box.height === 0 || box.top >= limit) continue;
      onEnter(entry.target);
    }
  });
  return {
    observe(target) {
      observer.observe(target as Element);
    },
    unobserve(target) {
      observer.unobserve(target as Element);
    },
    disconnect() {
      observer.disconnect();
    },
  };
}

export function Reveal({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let stop = () => {};
    let frame = 0;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const node = rootRef.current;
      if (!node) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const createObserver = typeof IntersectionObserver === "function" ? watchViewport : undefined;
      stop();
      stop = revealItems(node, window.innerHeight, reduced, createObserver, window.scrollY);
    };
    // A chip click commits the new grid before layout, and the face can still be loading.
    // Measure once, after both, so a card is not marked shown on a temporary box.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        void document.fonts.ready.then(() => {
          if (cancelled) return;
          frame = requestAnimationFrame(run);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stop();
    };
  });

  return (
    <div ref={rootRef} className={styles.root}>
      {children}
    </div>
  );
}
