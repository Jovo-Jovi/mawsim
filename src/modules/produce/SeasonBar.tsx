import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { calendarMonths, isInSeason, type CalendarMonth } from "../../domain";
import type { Produce } from "./catalogue";
import { seasonRuns } from "./season-text";
import styles from "./SeasonBar.module.css";

type MonthLabels = {
  readonly "1": string;
  readonly "2": string;
  readonly "3": string;
  readonly "4": string;
  readonly "5": string;
  readonly "6": string;
  readonly "7": string;
  readonly "8": string;
  readonly "9": string;
  readonly "10": string;
  readonly "11": string;
  readonly "12": string;
};

const stateJoiner: Record<Locale, string> = {
  en: ", ",
  ar: "\u060C ",
};

function catalogueMonth(labels: MonthLabels, calendarMonth: CalendarMonth): string {
  const table: Record<CalendarMonth, string> = {
    1: labels["1"],
    2: labels["2"],
    3: labels["3"],
    4: labels["4"],
    5: labels["5"],
    6: labels["6"],
    7: labels["7"],
    8: labels["8"],
    9: labels["9"],
    10: labels["10"],
    11: labels["11"],
    12: labels["12"],
  };
  return table[calendarMonth];
}

function seasonSentence(produce: Produce, locale: Locale): string {
  const copy = messages(locale);
  const name = (calendarMonth: CalendarMonth) => catalogueMonth(copy.months, calendarMonth);
  const phrases = seasonRuns(produce.months).map((span) => {
    if (span.from === span.to) return name(span.from);
    return copy.produce.seasonRange.replaceAll("{from}", name(span.from)).replaceAll("{to}", name(span.to));
  });
  const first = phrases[0];
  if (first === undefined) return copy.produce.inSeason;
  let list = first;
  for (const later of phrases.slice(1)) {
    list = copy.produce.seasonList.replaceAll("{earlier}", list).replaceAll("{later}", later);
  }
  return `${copy.produce.inSeason} ${list}`;
}

export function SeasonBar({
  produce,
  locale,
  currentMonth,
}: {
  produce: Produce;
  locale: Locale;
  currentMonth: CalendarMonth;
}) {
  const copy = messages(locale);
  return (
    <div className={styles.bar} data-kind={produce.kind}>
      <div className={styles.almanac}>
        <ol className={styles.cells}>
          {calendarMonths.map((calendarMonth) => {
            const inSeason = isInSeason(produce.months, calendarMonth);
            const current = calendarMonth === currentMonth;
            const state = inSeason ? copy.produce.monthInSeason : copy.produce.monthOutOfSeason;
            return (
              <li
                key={calendarMonth}
                className={styles.cell}
                data-current={current ? "true" : "false"}
                data-in={inSeason ? "true" : "false"}
              >
                <span className={styles.fill} aria-hidden="true" />
                <span className={styles.short} aria-hidden="true">
                  {catalogueMonth(copy.monthsShort, calendarMonth)}
                </span>
                <span className={styles.state}>
                  {catalogueMonth(copy.months, calendarMonth)}
                  {stateJoiner[locale]}
                  {state}
                </span>
              </li>
            );
          })}
        </ol>
        <div className={styles.markerTrack}>
          <span className={styles.marker} data-slot={currentMonth}>
            {copy.produce.thisMonth}
          </span>
        </div>
      </div>
      <p className={styles.sentence}>{seasonSentence(produce, locale)}</p>
    </div>
  );
}
