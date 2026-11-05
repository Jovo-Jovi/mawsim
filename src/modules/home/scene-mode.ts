/** Narrower than this, the hero decoration stays the still poster (DESIGN_SYSTEM §13). */
export const SCENE_MIN_WIDTH_REM = 22.5;

const LOW_POWER_AT_MOST = 2;

export type SceneSignals = {
  reducedMotion: boolean;
  webgl: boolean;
  viewportRem: number;
  hardwareConcurrency: number | null;
  saveData: boolean;
};

export function sceneMode(signals: SceneSignals): "scene" | "poster" {
  if (signals.reducedMotion) return "poster";
  if (!signals.webgl) return "poster";
  if (signals.viewportRem < SCENE_MIN_WIDTH_REM) return "poster";
  if (signals.hardwareConcurrency !== null && signals.hardwareConcurrency <= LOW_POWER_AT_MOST) return "poster";
  if (signals.saveData) return "poster";
  return "scene";
}

/** Next `aria-pressed` value. True holds the turn. */
export function nextScenePressed(pressed: boolean): boolean {
  return !pressed;
}

/**
 * `--scene-turn` as milliseconds. A missing or unitless value is null, so the
 * scene never invents a duration.
 */
export function sceneTurnMs(declared: string): number | null {
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(declared.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return match[2] === "s" ? amount * 1000 : amount;
}
