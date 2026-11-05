import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { calendarMonths, type CalendarMonth } from "../../domain";
import styles from "./SeasonDial.module.css";

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

function formatCount(locale: Locale, count: number): string {
  return new Intl.NumberFormat(locale).format(count);
}

export function SeasonDial({
  locale,
  currentMonth,
  inSeasonCount,
}: {
  locale: Locale;
  currentMonth: CalendarMonth;
  inSeasonCount: number;
}) {
  const copy = messages(locale);
  const numeral = formatCount(locale, inSeasonCount);
  const sentence = copy.home.dialCount.replaceAll("{count}", numeral);
  return (
    <div className={styles.cluster}>
      <div className={styles.plate} data-season-dial="" aria-hidden="true">
        <svg viewBox="0 0 40 40" className={styles.ring} focusable="false">
          <g className={styles.turn}>
            {calendarMonths.map((calendarMonth, index) => {
              const current = calendarMonth === currentMonth;
              const d = arcPath(index);
              return (
                <g key={calendarMonth} data-arc={calendarMonth} data-current={current ? "true" : "false"}>
                  <path d={d} pathLength="1" className={current ? styles.currentBed : styles.bed} />
                  <path d={d} pathLength="1" className={current ? styles.currentArc : styles.arc} />
                </g>
              );
            })}
          </g>
        </svg>
        <span className={styles.numeral}>{numeral}</span>
      </div>
      <p className={styles.equivalent}>{sentence}</p>
    </div>
  );
}
