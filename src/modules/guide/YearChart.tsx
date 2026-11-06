import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref, otherLocale } from "@/i18n/href";
import { messages } from "@/i18n/messages";
import { catalogueMonth, seasonSentence, type Produce } from "@/modules/produce";
import { calendarMonths, isInSeason, type CalendarMonth, type ProduceKind } from "../../domain";
import cardStyles from "./CardGrid.module.css";
import { guideHref } from "./guide-query";
import styles from "./YearChart.module.css";

const nameIn: Record<Locale, (produce: Produce) => string> = {
  en: (produce) => produce.en,
  ar: (produce) => produce.ar,
};

export function YearChart({
  produce,
  locale,
  currentMonth,
  selectedMonth,
  kind,
}: {
  produce: readonly Produce[];
  locale: Locale;
  currentMonth: CalendarMonth;
  selectedMonth: CalendarMonth;
  kind: ProduceKind | null;
}) {
  const copy = messages(locale);
  if (produce.length === 0) {
    const monthName = catalogueMonth(copy.months, selectedMonth);
    return (
      <div className={cardStyles.empty} data-year-chart="">
        <p className={cardStyles.sentence}>{copy.guide.empty.replaceAll("{month}", monthName)}</p>
        <div className={cardStyles.actions}>
          <Link className={cardStyles.action} href={guideHref(locale, selectedMonth, null, "chart")}>
            {copy.guide.showAll}
          </Link>
          {selectedMonth !== currentMonth ? (
            <Link className={cardStyles.action} href={guideHref(locale, null, kind, "chart")}>
              {copy.guide.showThisMonth}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const other = otherLocale(locale);
  return (
    <div className={styles.chart} data-year-chart="">
      <div className={styles.head} data-chart-head="" aria-hidden="true">
        <div className={styles.identity} />
        <div className={styles.track}>
          {calendarMonths.map((calendarMonth) => (
            <span
              key={calendarMonth}
              className={styles.heading}
              data-month={calendarMonth}
              data-selected={calendarMonth === selectedMonth ? "true" : undefined}
              data-tick={calendarMonth === currentMonth ? "true" : undefined}
            >
              {catalogueMonth(copy.monthsShort, calendarMonth)}
            </span>
          ))}
        </div>
      </div>
      <ol className={styles.list} aria-label={copy.guide.chart}>
        {produce.map((row) => (
          <li key={row.slug} className={styles.row} data-kind={row.kind}>
            <div className={styles.identity}>
              <Link className={styles.name} href={localeHref(locale, `/produce/${row.slug}`)}>
                <bdi>{nameIn[locale](row)}</bdi>
              </Link>
              <p className={styles.counter} lang={other}>
                <bdi>{nameIn[other](row)}</bdi>
              </p>
              <p className={styles.sentence}>{seasonSentence(row, locale)}</p>
            </div>
            <div className={styles.track} aria-hidden="true">
              {calendarMonths.map((calendarMonth) => (
                <span
                  key={calendarMonth}
                  className={styles.cell}
                  data-month={calendarMonth}
                  data-in={isInSeason(row.months, calendarMonth) ? "true" : "false"}
                  data-selected={calendarMonth === selectedMonth ? "true" : undefined}
                  data-tick={calendarMonth === currentMonth ? "true" : undefined}
                >
                  <span className={styles.mark} />
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
