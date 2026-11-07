export const THEME_STORAGE_KEY = "mawsim-theme";

export type ThemeChoice = "system" | "light" | "dark";

const listeners = new Set<(choice: ThemeChoice) => void>();

let remembered: ThemeChoice | undefined;

export function parseThemeChoice(value: unknown): ThemeChoice {
  if (value === "system" || value === "light" || value === "dark") return value;
  return "system";
}

function readStored(): ThemeChoice {
  try {
    return parseThemeChoice(globalThis.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage is missing or blocked. The choice is System.
    return "system";
  }
}

export function currentThemeChoice(): ThemeChoice {
  if (remembered === undefined) remembered = readStored();
  return remembered;
}

function applyTheme(choice: ThemeChoice): void {
  const root = globalThis.document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function chooseTheme(choice: ThemeChoice): void {
  remembered = choice;
  try {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Saving can throw. The page in view still uses the choice.
  }
  applyTheme(choice);
  for (const listener of listeners) listener(choice);
}

export function applyCurrentTheme(): void {
  applyTheme(currentThemeChoice());
}

export function subscribeThemeChoice(listener: (choice: ThemeChoice) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
