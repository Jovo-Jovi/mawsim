"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { applyCurrentTheme, chooseTheme, currentThemeChoice, subscribeThemeChoice } from "./theme-storage";
import styles from "./ThemeSwitch.module.css";

export function ThemeSwitch({
  label,
  system,
  light,
  dark,
}: {
  label: string;
  system: string;
  light: string;
  dark: string;
}) {
  const choice = useSyncExternalStore(subscribeThemeChoice, currentThemeChoice, () => "system");
  useLayoutEffect(() => {
    // A locale change commits <html> again and drops data-theme. Put the choice back
    // before paint. This does not write storage.
    applyCurrentTheme();
  });
  const options = [
    { choice: "system", icon: "auto", name: system },
    { choice: "light", icon: "sun", name: light },
    { choice: "dark", icon: "moon", name: dark },
  ] as const;

  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.choice}
          type="button"
          className={styles.choice}
          data-theme-choice={option.choice}
          aria-pressed={choice === option.choice ? "true" : "false"}
          aria-label={option.name}
          onClick={() => chooseTheme(option.choice)}
        >
          <Icon name={option.icon} />
        </button>
      ))}
    </div>
  );
}
