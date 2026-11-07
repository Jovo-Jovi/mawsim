import { chooseTheme, currentThemeChoice, type ThemeChoice } from "./theme-storage";

let revealSerial = 0;
let runningTransition: ViewTransition | null = null;
let runningClip: Animation | null = null;
let fadeSerial = 0;

function paintedTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice === "light" || choice === "dark") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function motionReduced(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function token(name: "--dur-theme" | "--ease-in-out"): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function durationMs(declared: string): number {
  return Number.parseFloat(declared);
}

function revealGeometry(from: HTMLElement): { x: number; y: number; radius: number } {
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const radius = Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y),
  );
  return { x, y, radius };
}

function watch(promise: Promise<unknown>, after?: () => void): void {
  promise.then(
    () => {
      after?.();
    },
    () => {
      after?.();
    },
  );
}

function interruptRunning(): void {
  const clip = runningClip;
  runningClip = null;
  if (clip) clip.cancel();
  const transition = runningTransition;
  runningTransition = null;
  if (transition) transition.skipTransition();
}

function playClip(from: HTMLElement, serial: number): void {
  if (serial !== revealSerial) return;
  const { x, y, radius } = revealGeometry(from);
  const clip = document.documentElement.animate(
    {
      clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
    },
    {
      duration: durationMs(token("--dur-theme")),
      easing: token("--ease-in-out"),
      fill: "both",
      pseudoElement: "::view-transition-new(root)",
    },
  );
  runningClip = clip;
  watch(clip.finished, () => {
    if (runningClip === clip) runningClip = null;
  });
}

function cssTransitions(): Animation[] {
  if (typeof CSSTransition !== "function") return [];
  return document.getAnimations().filter((animation) => animation instanceof CSSTransition);
}

function fadeTo(choice: ThemeChoice): void {
  const serial = ++fadeSerial;
  const root = document.documentElement;
  root.setAttribute("data-theme-fade", "");
  chooseTheme(choice);
  const fading = cssTransitions();
  const clear = () => {
    if (serial !== fadeSerial) return;
    root.removeAttribute("data-theme-fade");
  };
  if (fading.length === 0) {
    clear();
    return;
  }
  void Promise.all(
    fading.map((animation) =>
      animation.finished.then(
        () => undefined,
        () => undefined,
      ),
    ),
  ).then(clear);
}

export function revealThemeChoice(choice: ThemeChoice, from: HTMLElement): void {
  if (paintedTheme(currentThemeChoice()) === paintedTheme(choice)) {
    chooseTheme(choice);
    return;
  }
  if (motionReduced()) {
    chooseTheme(choice);
    return;
  }
  interruptRunning();
  const serial = ++revealSerial;
  if (typeof document.startViewTransition === "function") {
    const transition = document.startViewTransition(() => {
      chooseTheme(choice);
    });
    runningTransition = transition;
    watch(transition.updateCallbackDone);
    watch(transition.finished, () => {
      if (runningTransition === transition) runningTransition = null;
    });
    transition.ready.then(
      () => {
        playClip(from, serial);
      },
      () => undefined,
    );
    return;
  }
  fadeTo(choice);
}
