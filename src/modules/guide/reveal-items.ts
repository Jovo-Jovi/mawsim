export type RevealTarget = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  getBoundingClientRect(): { readonly top: number };
};

export type RevealRoot = {
  querySelectorAll(selector: string): ArrayLike<RevealTarget>;
};

export type RevealObserver = {
  observe(target: RevealTarget): void;
  unobserve(target: RevealTarget): void;
  disconnect(): void;
};

export type RevealObserverFactory = (onEnter: (target: RevealTarget) => void) => RevealObserver;

const REVEAL_SELECTOR = "[data-reveal-item]";

/**
 * Marks targets below the first viewport and reveals each one once.
 * Returns a cleanup that disconnects the single observer.
 * Reduced motion and a missing factory mark nothing, so the page stays visible.
 */
export function revealItems(
  root: RevealRoot,
  viewportHeight: number,
  reducedMotion: boolean,
  createObserver: RevealObserverFactory | null | undefined,
  scrollOffset = 0,
): () => void {
  if (reducedMotion || createObserver == null) return () => {};

  const targets = Array.from(root.querySelectorAll(REVEAL_SELECTOR));
  const waiting: RevealTarget[] = [];

  for (const target of targets) {
    const state = target.getAttribute("data-reveal");
    if (state === "shown") continue;
    if (state === "pending") {
      waiting.push(target);
      continue;
    }
    if (target.getBoundingClientRect().top + scrollOffset < viewportHeight) continue;
    target.setAttribute("data-reveal", "pending");
    waiting.push(target);
  }

  if (waiting.length === 0) return () => {};

  const held: { observer: RevealObserver | null } = { observer: null };
  const observer = createObserver((target) => {
    if (target.getAttribute("data-reveal") === "shown") return;
    target.setAttribute("data-reveal", "shown");
    held.observer?.unobserve(target);
  });
  held.observer = observer;

  for (const target of waiting) observer.observe(target);

  return () => {
    observer.disconnect();
  };
}
