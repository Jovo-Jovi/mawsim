import {
  calendarMonths,
  isInSeason,
  type CalendarMonth,
  type ProduceKind,
  type SeasonMonths,
} from "../../domain";
import { calendarMonthAccentTick, dialViewBoxSize, ringCellPath } from "./dial-geometry";
import styles from "./SeasonRing.module.css";

export function SeasonRing({
  kind,
  months,
  currentMonth,
}: {
  kind: ProduceKind;
  months: SeasonMonths;
  currentMonth?: CalendarMonth;
}) {
  return (
    <svg
      viewBox={`0 0 ${dialViewBoxSize} ${dialViewBoxSize}`}
      className={styles.ring}
      data-kind={kind}
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.turn}>
        {calendarMonths.map((calendarMonth, index) => {
          const inSeason = isInSeason(months, calendarMonth);
          const d = ringCellPath(index);
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
        {currentMonth === undefined ? null : <line className={styles.tick} {...calendarMonthAccentTick(currentMonth)} />}
      </g>
    </svg>
  );
}
