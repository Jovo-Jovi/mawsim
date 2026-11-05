"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { HeroScenePoster } from "./HeroScenePoster";
import { SCENE_MIN_WIDTH_REM, sceneMode, type SceneSignals } from "./scene-mode";
import styles from "./HeroScene.module.css";

const HeroScene = dynamic(() => import("./HeroScene").then((mod) => mod.HeroScene), { ssr: false });

type NetworkInformation = { saveData?: boolean };

function readSignals(): SceneSignals {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) !== null;
  } catch {
    webgl = false;
  }
  const wide = window.matchMedia(`(min-width: ${SCENE_MIN_WIDTH_REM}rem)`).matches;
  const cores = navigator.hardwareConcurrency;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return {
    reducedMotion,
    webgl,
    viewportRem: wide ? SCENE_MIN_WIDTH_REM : 0,
    hardwareConcurrency: typeof cores === "number" ? cores : null,
    saveData: connection?.saveData === true,
  };
}

export function HeroSceneFrame({ pauseLabel }: { pauseLabel: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"scene" | "poster" | null>(null);

  const onDrawn = useCallback(() => {
    frameRef.current?.setAttribute("data-scene-drawn", "");
  }, []);

  useLayoutEffect(() => {
    if (mode !== "scene") frameRef.current?.removeAttribute("data-scene-drawn");
  }, [mode]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia(`(min-width: ${SCENE_MIN_WIDTH_REM}rem)`);
    const apply = () => {
      setMode(sceneMode(readSignals()));
    };
    apply();
    reduced.addEventListener("change", apply);
    wide.addEventListener("change", apply);
    return () => {
      reduced.removeEventListener("change", apply);
      wide.removeEventListener("change", apply);
    };
  }, []);

  return (
    <div ref={frameRef} className={styles.frame} data-hero-scene="" data-scene-mode={mode ?? undefined}>
      <HeroScenePoster />
      {mode === "scene" ? <HeroScene pauseLabel={pauseLabel} onDrawn={onDrawn} /> : null}
    </div>
  );
}
