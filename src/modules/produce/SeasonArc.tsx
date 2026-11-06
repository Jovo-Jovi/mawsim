import type { CSSProperties } from "react";
import type { Locale } from "@/i18n/config";
import { directionOf } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { calendarMonths, isInSeason, type CalendarMonth } from "../../domain";
import type { Produce } from "./catalogue";
import {
  arcDiscShare,
  arcLabelRadiusShare,
  arcRingDiameterShare,
  calendarMonthAccentTick,
  cellMidpointLabelPoint,
  dialViewBoxSize,
  ringCellPath,
} from "./dial-geometry";
import { ProducePhoto } from "./ProducePhoto";
import type { ProducePhotoRow } from "./photos";
import { catalogueMonth, seasonSentence } from "./season-sentence";
import { seasonRuns } from "./season-text";
import styles from "./SeasonArc.module.css";

const nextCalendarMonth: Record<CalendarMonth, CalendarMonth> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
  10: 11,
  11: 12,
  12: 1,
};

function arcDrawPlaces(months: Produce["months"]): ReadonlyMap<CalendarMonth, number> {
  const places = new Map<CalendarMonth, number>();
  let place = 0;
  for (const span of seasonRuns(months)) {
    let cursor: CalendarMonth = span.from;
    for (;;) {
      places.set(cursor, place);
      place += 1;
      if (cursor === span.to) break;
      cursor = nextCalendarMonth[cursor];
    }
  }
  return places;
}

export function SeasonArc({
  produce,
  photo,
  locale,
  currentMonth,
}: {
  produce: Produce;
  photo: ProducePhotoRow | undefined;
  locale: Locale;
  currentMonth: CalendarMonth;
}) {
  const copy = messages(locale);
  const direction = directionOf(locale);
  const drawPlaces = arcDrawPlaces(produce.months);
  const arcStyle = {
    "--arc-ring": arcRingDiameterShare.toFixed(4),
    "--arc-label": arcLabelRadiusShare.toFixed(4),
    "--arc-disc": arcDiscShare.toFixed(4),
  } as CSSProperties;
  return (
    <div className={styles.block}>
      <div className={styles.arc} data-kind={produce.kind} style={arcStyle}>
        <svg
          viewBox={`0 0 ${dialViewBoxSize} ${dialViewBoxSize}`}
          className={styles.ring}
          aria-hidden="true"
          focusable="false"
        >
          <g className={styles.turn}>
            {calendarMonths.map((calendarMonth, index) => {
              const inSeason = isInSeason(produce.months, calendarMonth);
              const d = ringCellPath(index);
              const place = drawPlaces.get(calendarMonth);
              const drawn =
                inSeason && place !== undefined
                  ? ({
                      "--arc-draw-place": String(place),
                      "--arc-draw-count": String(drawPlaces.size),
                    } as CSSProperties)
                  : undefined;
              return (
                <g key={calendarMonth}>
                  <path d={d} className={inSeason ? styles.inBed : styles.outBed} />
                  <path
                    d={d}
                    className={inSeason ? styles.inArc : styles.outArc}
                    data-calendar-month={calendarMonth}
                    data-in={inSeason ? "true" : "false"}
                    style={drawn}
                  />
                </g>
              );
            })}
            <line className={styles.tick} data-arc-tick="" {...calendarMonthAccentTick(currentMonth)} />
          </g>
        </svg>
        <div className={styles.names} aria-hidden="true">
          {calendarMonths.map((calendarMonth) => {
            const point = cellMidpointLabelPoint(calendarMonth, 1, direction);
            const place = {
              "--arc-sx": (point.x - dialViewBoxSize / 2).toFixed(6),
              "--arc-sy": (point.y - dialViewBoxSize / 2).toFixed(6),
            } as CSSProperties;
            return (
              <span
                key={calendarMonth}
                className={styles.label}
                data-arc-label={calendarMonth === currentMonth ? "current" : ""}
                style={place}
              >
                {catalogueMonth(copy.monthsShort, calendarMonth)}
              </span>
            );
          })}
        </div>
        <div className={styles.disc}>
          <ProducePhoto produce={produce} photo={photo} locale={locale} slot="page" priority />
        </div>
      </div>
      <p className={styles.now}>
        <span className={styles.marker}>{copy.produce.thisMonth}</span>
        <span className={styles.accent}>{catalogueMonth(copy.months, currentMonth)}</span>
      </p>
      <p className={styles.sentence}>{seasonSentence(produce, locale)}</p>
      <ol className={styles.states}>
        {calendarMonths.map((calendarMonth) => {
          const state = isInSeason(produce.months, calendarMonth)
            ? copy.produce.monthInSeason
            : copy.produce.monthOutOfSeason;
          return (
            <li key={calendarMonth}>
              {catalogueMonth(copy.months, calendarMonth)}
              {copy.produce.stateJoin}
              {state}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
