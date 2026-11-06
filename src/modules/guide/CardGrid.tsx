import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { catalogueMonth, getProducePhoto, ProduceCard, type Produce } from "@/modules/produce";
import { filterByKind, isInSeason, type CalendarMonth, type ProduceKind } from "../../domain";
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
  const shown = new Set(
    filterByKind(
      produce.filter((row) => isInSeason(row.months, selectedMonth)),
      kind,
    ).map((row) => row.slug),
  );
  const grid = (
    <ul className={styles.grid}>
      {produce.map((row) => {
        const inSet = shown.has(row.slug);
        return (
          <li
            key={row.slug}
            className={styles.cell}
            data-flip-id={row.slug}
            hidden={inSet ? undefined : true}
            {...(inSet ? { "data-reveal-item": "" } : {})}
          >
            <ProduceCard
              produce={row}
              photo={getProducePhoto(row.slug)}
              locale={locale}
              currentMonth={currentMonth}
            />
          </li>
        );
      })}
    </ul>
  );
  if (shown.size > 0) return grid;

  const monthName = catalogueMonth(copy.months, selectedMonth);
  return (
    <>
      {grid}
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
    </>
  );
}
