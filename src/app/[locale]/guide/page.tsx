import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { filterByKind, parseKindParam, parseMonthParam } from "@/domain";
import { localeHref, otherLocale } from "@/i18n/href";
import { localeParam } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import { CardGrid, KindChips, MonthScroller, guideQuery } from "@/modules/guide";
import { catalogueMonth, inSeasonIn, thisCalendarMonth } from "@/modules/produce";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await localeParam();
  const copy = messages(locale);
  const other = otherLocale(locale);
  return {
    title: `${copy.nav.guide}${copy.app.titleJoin}${copy.app.name}`,
    description: copy.app.tagline,
    alternates: {
      languages: {
        [other]: localeHref(other, "/guide"),
      },
    },
  };
}

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[]; kind?: string | string[] }>;
}) {
  const locale = await localeParam();
  const query = await searchParams;
  const currentMonth = await thisCalendarMonth();
  const selectedMonth = parseMonthParam(query.month, currentMonth);
  const kind = parseKindParam(query.kind);
  const requestedMonth = query.month === String(selectedMonth) ? selectedMonth : null;
  const rows = filterByKind(inSeasonIn(selectedMonth), kind);
  const copy = messages(locale);
  const title = copy.guide.title.replaceAll("{month}", catalogueMonth(copy.months, selectedMonth));
  return (
    <PageShell locale={locale} path="/guide" query={guideQuery(requestedMonth, kind)}>
      <div className={styles.page}>
        <h1>{title}</h1>
        <MonthScroller locale={locale} selectedMonth={selectedMonth} currentMonth={currentMonth} kind={kind} />
        <KindChips locale={locale} selectedMonth={selectedMonth} kind={kind} />
        <CardGrid
          produce={rows}
          locale={locale}
          currentMonth={currentMonth}
          selectedMonth={selectedMonth}
          kind={kind}
        />
        <div className={styles.notice}>
          <SampleDataNotice locale={locale} />
        </div>
      </div>
    </PageShell>
  );
}
