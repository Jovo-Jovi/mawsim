import styles from "./HeroScene.module.css";

export function HeroScenePoster() {
  return (
    <svg className={styles.poster} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g data-produce="mango">
        <ellipse cx="36" cy="74" rx="14" ry="24" fill="var(--color-kind-fruit)" />
      </g>
      <g data-produce="orange">
        <circle cx="68" cy="42" r="16" fill="var(--color-kind-fruit)" />
      </g>
      <g data-produce="tomato">
        <circle cx="78" cy="82" r="15" fill="var(--color-kind-vegetable)" />
        <ellipse cx="78" cy="66" rx="7" ry="3" fill="var(--color-kind-leafy)" />
      </g>
      <g data-produce="dates">
        <circle cx="42" cy="36" r="6" fill="var(--color-kind-fruit)" />
        <circle cx="52" cy="30" r="5" fill="var(--color-kind-fruit)" />
        <circle cx="48" cy="42" r="5" fill="var(--color-kind-fruit)" />
        <circle cx="36" cy="44" r="4" fill="var(--color-kind-fruit)" />
      </g>
      <g data-produce="molokhia">
        <ellipse cx="100" cy="58" rx="9" ry="18" fill="var(--color-kind-leafy)" />
        <ellipse cx="104" cy="78" rx="3" ry="8" fill="var(--color-kind-leafy)" />
      </g>
    </svg>
  );
}
