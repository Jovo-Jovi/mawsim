import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { catalogueMonth } from "@/modules/produce";
import { calendarMonths, type CalendarMonth, type ProduceKind } from "../../domain";
import { guideHref } from "./guide-query";
import styles from "./MonthScroller.module.css";

export function MonthScroller({
  locale,
  selectedMonth,
  currentMonth,
  kind,
}: {
  locale: Locale;
  selectedMonth: CalendarMonth;
  currentMonth: CalendarMonth;
  kind: ProduceKind | null;
}) {
  const copy = messages(locale);
  return (
    <nav className={styles.nav} aria-label={copy.guide.months} data-month-scroller="true">
      <ol className={styles.list}>
        {calendarMonths.map((calendarMonth) => {
          const selected = calendarMonth === selectedMonth;
          const current = calendarMonth === currentMonth;
          return (
            <li key={calendarMonth} className={styles.item}>
              <Link
                className={styles.link}
                href={guideHref(locale, calendarMonth, kind)}
                aria-current={selected ? "true" : undefined}
              >
                {current ? <span className={styles.dot} aria-hidden="true" /> : null}
                <span className={styles.label}>
                  {catalogueMonth(copy.months, calendarMonth)}
                  {current ? <span className={styles.thisMonth}> {copy.guide.thisMonth}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
