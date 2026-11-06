import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import type { CalendarMonth, ProduceKind } from "../../domain";
import type { GuideView } from "./guide-query";
import { guideHref } from "./guide-query";
import chipStyles from "./KindChips.module.css";
import styles from "./GuideViewLinks.module.css";

export function GuideViewLinks({
  locale,
  selectedMonth,
  kind,
  view,
}: {
  locale: Locale;
  selectedMonth: CalendarMonth;
  kind: ProduceKind | null;
  view: GuideView;
}) {
  const copy = messages(locale).guide;
  const links = [
    { id: "list" as const, label: copy.cards },
    { id: "chart" as const, label: copy.yearChart },
  ];
  return (
    <nav className={styles.nav} aria-label={copy.views}>
      <ul className={chipStyles.list}>
        {links.map((link) => {
          const active = link.id === view;
          return (
            <li key={link.id} className={chipStyles.item}>
              <Link
                className={chipStyles.chip}
                href={guideHref(locale, selectedMonth, kind, link.id)}
                aria-current={active ? "true" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
