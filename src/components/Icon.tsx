import styles from "./Icon.module.css";

type Glyph = "arrow" | "notice" | "leaf" | "sun" | "moon" | "auto";

export function Icon({ name }: { name: Glyph }) {
  const directional = name === "arrow";
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={directional ? `${styles.icon} ${styles.arrow}` : styles.icon}
    >
      {name === "arrow" ? (
        <>
          <path d="M14.5 6.5 8 12l6.5 5.5" />
          <path d="M8 12h11" />
        </>
      ) : null}
      {name === "notice" ? (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 11.2V16.5" />
          <path d="M12 8h.01" />
        </>
      ) : null}
      {name === "leaf" ? (
        <>
          <path d="M12 20.5S5 16 5 10.2C5 6.4 8.1 4 12 4s7 2.4 7 6.2-7 10.3-7 10.3z" />
          <path d="M12 20.5V9" />
          <path d="M12 14c-2.2-1.1-3.8-3-4.5-5.2" />
        </>
      ) : null}
      {name === "sun" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
        </>
      ) : null}
      {name === "moon" ? <path d="M15.6 4.9a6.9 6.9 0 1 0 3.5 8.8 5.4 5.4 0 0 1-3.5-8.8z" /> : null}
      {name === "auto" ? (
        <>
          <circle cx="12" cy="12" r="7.25" />
          <path d="M12 4.75a7.25 7.25 0 0 0 0 14.5Z" fill="currentColor" stroke="none" />
        </>
      ) : null}
    </svg>
  );
}
