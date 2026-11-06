import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { Locale } from "@/i18n/config";
import { directionOf } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { catalogueMonth, YearDial } from "@/modules/produce";
import { calendarMonths, type CalendarMonth, type ProduceKind } from "../../domain";
import type { GuideView } from "./guide-query";
import { guideHref } from "./guide-query";
import styles from "./MonthPicker.module.css";

function adjacentMonth(calendarMonth: CalendarMonth, offset: -1 | 1): CalendarMonth {
  const index = (calendarMonth - 1 + offset + calendarMonths.length) % calendarMonths.length;
  return calendarMonths[index] ?? calendarMonth;
}

export function MonthPicker({
  locale,
  selectedMonth,
  currentMonth,
  kind,
  view = "list",
}: {
  locale: Locale;
  selectedMonth: CalendarMonth;
  currentMonth: CalendarMonth;
  kind: ProduceKind | null;
  view?: GuideView;
}) {
  const copy = messages(locale);
  const previous = adjacentMonth(selectedMonth, -1);
  const next = adjacentMonth(selectedMonth, 1);
  return (
    <nav className={styles.nav} aria-label={copy.guide.months} data-month-picker="">
      <YearDial
        selected={selectedMonth}
        currentMonth={currentMonth}
        direction={directionOf(locale)}
        label={(calendarMonth) => {
          const selected = calendarMonth === selectedMonth;
          const current = calendarMonth === currentMonth;
          return (
            <Link
              className={styles.link}
              href={guideHref(locale, calendarMonth, kind, view)}
              aria-current={selected ? "true" : undefined}
              data-month={calendarMonth}
            >
              {catalogueMonth(copy.monthsShort, calendarMonth)}
              {current ? <span className={styles.thisMonth}> {copy.guide.thisMonth}</span> : null}
            </Link>
          );
        }}
      />
      <div className={styles.steps}>
        <Link className={styles.step} href={guideHref(locale, previous, kind, view)} aria-label={copy.guide.previousMonth}>
          <Icon name="arrow" />
        </Link>
        <Link className={styles.step} href={guideHref(locale, next, kind, view)} aria-label={copy.guide.nextMonth}>
          <span className={styles.nextIcon}>
            <Icon name="arrow" />
          </span>
        </Link>
      </div>
    </nav>
  );
}
