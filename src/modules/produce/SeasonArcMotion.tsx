"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./SeasonArc.module.css";

gsap.registerPlugin(ScrollTrigger);

function customProperty(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function secondsOf(raw: string): number {
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount)) return Number.NaN;
  if (raw.endsWith("ms")) return amount * 1e-3;
  return amount;
}

function clearPaint(node: HTMLElement): void {
  node.style.removeProperty("transform");
  node.style.removeProperty("scale");
  node.style.removeProperty("translate");
  node.style.removeProperty("rotate");
  node.style.removeProperty("will-change");
}

export function SeasonArcMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const photo = root.querySelector("img");
    if (!(photo instanceof HTMLImageElement)) return;
    const frame = photo.closest("div");
    if (!(frame instanceof HTMLElement)) return;

    const ctx = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const scrub = secondsOf(customProperty("--story-scrub"));
        const zoom = Number.parseFloat(customProperty("--zoom-scroll"));
        if (!Number.isFinite(scrub) || !Number.isFinite(zoom)) return;

        const tween = gsap.fromTo(
          photo,
          { scale: 1 },
          {
            scale: zoom,
            ease: "none",
            scrollTrigger: {
              trigger: frame,
              start: 0,
              end: () => {
                const bounds = frame.getBoundingClientRect();
                const meet = bounds.bottom + window.scrollY;
                const maxScroll = Math.max(
                  0,
                  document.documentElement.scrollHeight - document.documentElement.clientHeight,
                );
                return Math.min(meet, maxScroll);
              },
              scrub,
            },
          },
        );

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          clearPaint(photo);
        };
      });
    }, root);

    return () => {
      ctx.revert();
      clearPaint(photo);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.motion}>
      {children}
    </div>
  );
}
