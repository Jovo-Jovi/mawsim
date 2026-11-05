import { expect, it } from "vitest";
import { nextScenePressed, sceneMode, sceneTurnMs, type SceneSignals } from "./scene-mode";

const open: SceneSignals = {
  reducedMotion: false,
  webgl: true,
  viewportRem: 40,
  hardwareConcurrency: 8,
  saveData: false,
};

it("returns poster when reduced motion is the only reason", () => {
  expect(sceneMode({ ...open, reducedMotion: true })).toBe("poster");
});

it("returns poster when missing WebGL is the only reason", () => {
  expect(sceneMode({ ...open, webgl: false })).toBe("poster");
});

it("returns poster when a viewport under 22.5rem is the only reason", () => {
  expect(sceneMode({ ...open, viewportRem: 20 })).toBe("poster");
});

it("returns poster when hardware concurrency of 2 or less is the only reason", () => {
  expect(sceneMode({ ...open, hardwareConcurrency: 2 })).toBe("poster");
  expect(sceneMode({ ...open, hardwareConcurrency: 1 })).toBe("poster");
});

it("returns poster when save-data is the only reason", () => {
  expect(sceneMode({ ...open, saveData: true })).toBe("poster");
});

it("returns scene when none of the five reasons hold", () => {
  expect(sceneMode(open)).toBe("scene");
});

it("treats exactly 22.5rem as a scene and anything narrower as a poster", () => {
  expect(sceneMode({ ...open, viewportRem: 22.5 })).toBe("scene");
  expect(sceneMode({ ...open, viewportRem: 22.499 })).toBe("poster");
});

it("does not treat a null concurrency as low power", () => {
  expect(sceneMode({ ...open, hardwareConcurrency: null })).toBe("scene");
});

it("toggles the pressed state both ways", () => {
  expect(nextScenePressed(false)).toBe(true);
  expect(nextScenePressed(true)).toBe(false);
});

it("reads a declared turn and refuses a unitless or empty one, so 48s is never invented", () => {
  expect(sceneTurnMs("48s")).toBe(48000);
  expect(sceneTurnMs("48000ms")).toBe(48000);
  expect(sceneTurnMs("")).toBeNull();
  expect(sceneTurnMs("48")).toBeNull();
  expect(sceneTurnMs("0s")).toBeNull();
});
