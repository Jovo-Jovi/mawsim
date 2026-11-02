import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { calendarMonths, isInSeason, type CalendarMonth } from "../../domain";
import type { Produce } from "./catalogue";
import { catalogueMonth, seasonSentence } from "./season-sentence";
import styles from "./SeasonBar.module.css";

const stateJoiner: Record<Locale, string> = {
  en: ", ",
  ar: "\u060C ",
};

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
                {current ? (
                  <span className={styles.markerRow} data-slot={currentMonth}>
                    <span className={styles.marker}>{copy.produce.thisMonth}</span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
      <p className={styles.sentence}>{seasonSentence(produce, locale)}</p>
    </div>
  );
}
