import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import type { CalendarMonth, ProduceKind } from "../../domain";
import type { GuideView } from "./guide-query";
import { guideHref } from "./guide-query";
import styles from "./KindChips.module.css";

const chipKinds = [null, "fruit", "vegetable", "leafy"] as const;

function chipLabel(chipKind: ProduceKind | null, locale: Locale): string {
  const copy = messages(locale);
  if (chipKind === null) return copy.guide.all;
  const labels = copy.kind;
  const table: Record<ProduceKind, string> = {
    fruit: labels.fruit,
    vegetable: labels.vegetable,
    leafy: labels.leafy,
  };
  return table[chipKind];
}

export function KindChips({
  locale,
  selectedMonth,
  kind,
  view = "list",
}: {
  locale: Locale;
  selectedMonth: CalendarMonth;
  kind: ProduceKind | null;
  view?: GuideView;
}) {
  return (
    <nav className={styles.nav} aria-label={messages(locale).guide.kinds}>
      <ul className={styles.list}>
        {chipKinds.map((chipKind) => {
          const active = chipKind === kind;
          return (
            <li key={chipKind ?? "all"} className={styles.item}>
              <Link
                className={styles.chip}
                href={guideHref(locale, selectedMonth, chipKind, view)}
                aria-current={active ? "true" : undefined}
              >
                {chipLabel(chipKind, locale)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
