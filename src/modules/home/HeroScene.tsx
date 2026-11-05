"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Mesh, type Group } from "three";
import { nextScenePressed, sceneTurnMs } from "./scene-mode";
import styles from "./HeroScene.module.css";

/** Vertical bob, about 1% of the framed height: under the 2% cap in DESIGN_SYSTEM §7. */
const BOB = 0.03;

type ScenePaint = {
  fruit: string;
  vegetable: string;
  leafy: string;
  light: string;
  turnMs: number;
};

type Point = [number, number, number];

const DATES: { position: Point; radius: number }[] = [
  { position: [-0.24, 0.62, 0.04], radius: 0.13 },
  { position: [-0.06, 0.76, -0.06], radius: 0.11 },
  { position: [-0.4, 0.7, 0], radius: 0.1 },
  { position: [-0.14, 0.48, 0.16], radius: 0.12 },
  { position: [0.04, 0.58, -0.02], radius: 0.09 },
];

function readPaint(node: HTMLElement): ScenePaint | null {
  const style = getComputedStyle(node);
  const turnMs = sceneTurnMs(style.getPropertyValue("--scene-turn"));
  const fruit = style.getPropertyValue("--color-kind-fruit").trim();
  const vegetable = style.getPropertyValue("--color-kind-vegetable").trim();
  const leafy = style.getPropertyValue("--color-kind-leafy").trim();
  const light = style.getPropertyValue("--color-highlight").trim();
  if (turnMs === null || !fruit || !vegetable || !leafy || !light) return null;
  return { fruit, vegetable, leafy, light, turnMs };
}

function Skin({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.84} metalness={0} flatShading />;
}

function ProduceScene({
  paint,
  runningRef,
  onAngle,
}: {
  paint: ScenePaint;
  runningRef: { current: boolean };
  onAngle: (angle: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    let frame = 0;
    let previous = 0;
    let angle = 0;
    const tick = (now: number) => {
      if (previous === 0) previous = now;
      const delta = now - previous;
      previous = now;
      if (runningRef.current) {
        angle += (delta / paint.turnMs) * Math.PI * 2;
        group.rotation.y = angle;
        group.position.y = Math.sin(angle) * BOB;
        onAngle(angle);
        invalidate();
      }
      frame = requestAnimationFrame(tick);
    };
    invalidate();
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      });
      // The canvas root then releases the renderer (WebGLRenderer.dispose and context loss).
    };
  }, [invalidate, onAngle, paint.turnMs, runningRef]);

  return (
    <>
      <directionalLight color={paint.light} intensity={2.6} position={[2.1, 1.8, 2.6]} />
      <group ref={groupRef}>
        <mesh position={[-0.72, -0.06, 0.16]} scale={[0.72, 1.18, 0.64]}>
          <sphereGeometry args={[0.42, 8, 6]} />
          <Skin color={paint.fruit} />
        </mesh>
        <mesh position={[0.22, 0.08, 0.46]}>
          <sphereGeometry args={[0.38, 8, 6]} />
          <Skin color={paint.fruit} />
        </mesh>
        <mesh position={[0.96, -0.14, 0.06]} scale={[1, 0.88, 1]}>
          <sphereGeometry args={[0.34, 8, 6]} />
          <Skin color={paint.vegetable} />
        </mesh>
        <mesh position={[0.96, 0.22, 0.1]}>
          <coneGeometry args={[0.1, 0.18, 6]} />
          <Skin color={paint.leafy} />
        </mesh>
        {DATES.map((date) => (
          <mesh key={date.position.join(":")} position={date.position}>
            <sphereGeometry args={[date.radius, 6, 5]} />
            <Skin color={paint.fruit} />
          </mesh>
        ))}
        <mesh position={[0.48, -0.58, -0.16]} scale={[0.4, 0.95, 0.12]}>
          <sphereGeometry args={[0.46, 7, 5]} />
          <Skin color={paint.leafy} />
        </mesh>
      </group>
    </>
  );
}

export function HeroScene({ label, pause, play }: { label: string; pause: string; play: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const [pressed, setPressed] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [paint, setPaint] = useState<ScenePaint | null>(null);

  const running = !pressed && onScreen && !hidden && paint !== null;
  useLayoutEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    setPaint(readPaint(node));
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof IntersectionObserver !== "function") {
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      setOnScreen(entry?.isIntersecting ?? false);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // data-scene-rotation: the group's vertical turn in radians, for the hero-scene check.
  const onAngle = useCallback((angle: number) => {
    rootRef.current?.setAttribute("data-scene-rotation", angle.toFixed(5));
  }, []);

  return (
    <div ref={rootRef} className={styles.scene} data-scene-rotation="0">
      <div className={styles.viewport} aria-hidden="true">
        {paint ? (
          <Canvas
            frameloop="demand"
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
            camera={{ fov: 32, position: [0, 0.28, 4.6], near: 0.1, far: 20 }}
            onCreated={({ gl }) => gl.setClearAlpha(0)}
          >
            <ProduceScene paint={paint} runningRef={runningRef} onAngle={onAngle} />
          </Canvas>
        ) : null}
      </div>
      <button
        type="button"
        className={styles.control}
        aria-pressed={pressed}
        onClick={() => setPressed((current) => nextScenePressed(current))}
      >
        <span>{label}</span>
        <span className={styles.action}>{pressed ? play : pause}</span>
      </button>
    </div>
  );
}
