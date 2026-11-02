import styles from "./Icon.module.css";

type Glyph = "arrow" | "notice" | "leaf";

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
    </svg>
  );
}
