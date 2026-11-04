import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { catalogueMonth, getProducePhoto, ProduceCard, type Produce } from "@/modules/produce";
import type { CalendarMonth, ProduceKind } from "../../domain";
import { guideHref } from "./guide-query";
import styles from "./CardGrid.module.css";

export function CardGrid({
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
      <div className={styles.empty}>
        <p className={styles.sentence}>{copy.guide.empty.replaceAll("{month}", monthName)}</p>
        <div className={styles.actions}>
          <Link className={styles.action} href={guideHref(locale, selectedMonth, null)}>
            {copy.guide.showAll}
          </Link>
          {selectedMonth !== currentMonth ? (
            <Link className={styles.action} href={guideHref(locale, null, kind)}>
              {copy.guide.showThisMonth}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ul className={styles.grid}>
      {produce.map((row) => (
        <li key={row.slug} className={styles.cell}>
          <ProduceCard
            produce={row}
            photo={getProducePhoto(row.slug)}
            locale={locale}
            currentMonth={currentMonth}
          />
        </li>
      ))}
    </ul>
  );
}
