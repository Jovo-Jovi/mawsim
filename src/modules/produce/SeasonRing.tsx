import { calendarMonths, isInSeason, type ProduceKind, type SeasonMonths } from "../../domain";
import styles from "./SeasonRing.module.css";

const CENTER = 20;
const RADIUS = 15.5;
const GAP = 0.28;

function arcPoint(angle: number): { x: string; y: string } {
  return {
    x: (CENTER + RADIUS * Math.sin(angle)).toFixed(3),
    y: (CENTER - RADIUS * Math.cos(angle)).toFixed(3),
  };
}

function arcPath(index: number): string {
  const sweep = (Math.PI * 2) / calendarMonths.length;
  const start = index * sweep + GAP / 2;
  const end = (index + 1) * sweep - GAP / 2;
  const from = arcPoint(start);
  const to = arcPoint(end);
  return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 0 1 ${to.x} ${to.y}`;
}

export function SeasonRing({ kind, months }: { kind: ProduceKind; months: SeasonMonths }) {
  return (
    <svg viewBox="0 0 40 40" className={styles.ring} data-kind={kind} aria-hidden="true" focusable="false">
      <g className={styles.turn}>
        {calendarMonths.map((calendarMonth, index) => {
          const inSeason = isInSeason(months, calendarMonth);
          const d = arcPath(index);
          return (
            <g key={calendarMonth}>
              <path d={d} className={inSeason ? styles.inBed : styles.outBed} />
              <path
                d={d}
                className={inSeason ? styles.inArc : styles.outArc}
                data-in={inSeason ? "true" : "false"}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
