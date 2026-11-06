import type { CSSProperties, ReactNode } from "react";
import { calendarMonths, type CalendarMonth } from "../../domain";
import {
  calendarMonthAccentTick,
  calendarMonthLabelPoint,
  dialTurnDegrees,
  dialViewBoxSize,
  ringCellPath,
  storyLabelRadiusShare,
  storyOrbitBandRatio,
  storyOrbitBandRatioWide,
} from "./dial-geometry";
import styles from "./YearDial.module.css";

/**
 * Label-centre radius in the 40-unit dial. At `--dial-picker-size` 18rem
 * (288px) this is 121.5px: a 44px square stays inside the dial and clears
 * its neighbour on the diagonal (the tight pair is 0.47px apart).
 */
const labelRadius = 16.875;

function percentOfDial(coordinate: number): string {
  const ratio = ((coordinate - dialViewBoxSize / 2) / dialViewBoxSize) * 100;
  return `${ratio.toFixed(4)}cqi`;
}

export function YearDial({
  selected,
  currentMonth,
  direction,
  label,
  centre,
  story = false,
}: {
  selected: CalendarMonth;
  currentMonth: CalendarMonth;
  direction: "ltr" | "rtl";
  label: (calendarMonth: CalendarMonth) => ReactNode;
  centre?: ReactNode;
  story?: boolean;
}) {
  const turn = {
    "--dial-turn": `${dialTurnDegrees(selected, direction)}deg`,
  } as CSSProperties;
  const frameStyle = (
    story
      ? {
          ...turn,
          "--story-band": storyOrbitBandRatio.toFixed(4),
          "--story-band-wide": storyOrbitBandRatioWide.toFixed(4),
        }
      : turn
  ) as CSSProperties;
  return (
    <div className={story ? `${styles.dial} ${styles.story}` : styles.dial} style={frameStyle}>
      {centre != null ? <div className={styles.centre}>{centre}</div> : null}
      <div className={styles.turn} data-dial-turn="">
        <svg
          viewBox={`0 0 ${dialViewBoxSize} ${dialViewBoxSize}`}
          className={styles.ring}
          data-dial-ring=""
          aria-hidden="true"
          focusable="false"
        >
          {calendarMonths.map((calendarMonth, index) => {
            const d = ringCellPath(index);
            return (
              <g key={calendarMonth}>
                <path d={d} className={styles.bed} />
                <path d={d} className={styles.cell} />
              </g>
            );
          })}
          <line className={styles.tick} {...calendarMonthAccentTick(currentMonth)} />
        </svg>
        {calendarMonths.map((calendarMonth) => {
          const point = calendarMonthLabelPoint(
            calendarMonth,
            story ? storyLabelRadiusShare * dialViewBoxSize : labelRadius,
            direction,
          );
          const place = {
            "--dial-x": percentOfDial(point.x),
            "--dial-y": percentOfDial(point.y),
          } as CSSProperties;
          return (
            <div key={calendarMonth} className={styles.slot} style={place}>
              <div className={styles.label} data-dial-label="">
                {label(calendarMonth)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
