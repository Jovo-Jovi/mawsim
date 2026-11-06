import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { filterByKind, parseKindParam, parseMonthParam } from "@/domain";
import { localeHref, otherLocale } from "@/i18n/href";
import { localeParam } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import { CardGrid, GuideViewLinks, KindChips, MonthPicker, Reveal, YearChart, guideQuery, parseGuideView } from "@/modules/guide";
import { catalogueMonth, getTexturePhoto, inSeasonIn, listProduce, MarketTexture, thisCalendarMonth } from "@/modules/produce";
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
  searchParams: Promise<{ month?: string | string[]; kind?: string | string[]; view?: string | string[] }>;
}) {
  const locale = await localeParam();
  const query = await searchParams;
  const currentMonth = await thisCalendarMonth();
  const selectedMonth = parseMonthParam(query.month, currentMonth);
  const kind = parseKindParam(query.kind);
  const view = parseGuideView(query.view);
  const requestedMonth = query.month === String(selectedMonth) ? selectedMonth : null;
  const rows = filterByKind(inSeasonIn(selectedMonth), kind);
  const chartRows = filterByKind(listProduce(), kind);
  const copy = messages(locale);
  const title = copy.guide.title.replaceAll("{month}", catalogueMonth(copy.months, selectedMonth));
  return (
    <PageShell locale={locale} path="/guide" query={guideQuery(requestedMonth, kind, view)}>
      <div className={styles.page}>
        <div className={styles.header} data-texture-band="guide">
          <MarketTexture photo={getTexturePhoto()} />
          <h1>{title}</h1>
          <MonthPicker
            locale={locale}
            selectedMonth={selectedMonth}
            currentMonth={currentMonth}
            kind={kind}
            view={view}
          />
          <GuideViewLinks locale={locale} selectedMonth={selectedMonth} kind={kind} view={view} />
          <KindChips locale={locale} selectedMonth={selectedMonth} kind={kind} view={view} />
        </div>
        <Reveal>
          {view === "chart" ? (
            <YearChart
              produce={chartRows}
              locale={locale}
              currentMonth={currentMonth}
              selectedMonth={selectedMonth}
              kind={kind}
            />
          ) : (
            <CardGrid
              key={`${selectedMonth}-${kind ?? "all"}`}
              produce={rows}
              locale={locale}
              currentMonth={currentMonth}
              selectedMonth={selectedMonth}
              kind={kind}
            />
          )}
          <div className={styles.notice} data-reveal-item="">
            <SampleDataNotice locale={locale} />
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}
