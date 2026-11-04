import { PageShell } from "@/components/PageShell";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { localeParam } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import { CardGrid } from "@/modules/guide";
import { Hero } from "@/modules/home";
import { getHeroPhoto, inSeasonIn, thisCalendarMonth, type Produce } from "@/modules/produce";
import styles from "./page.module.css";

function firstInSeason(rows: readonly Produce[]): Produce {
  const first = rows[0];
  if (!first) throw new Error("no produce is in season");
  return first;
}

export default async function HomePage() {
  const locale = await localeParam();
  const currentMonth = await thisCalendarMonth();
  const rows = inSeasonIn(currentMonth);
  const copy = messages(locale);
  return (
    <PageShell locale={locale} path="">
      <div className={styles.page}>
        <Hero
          locale={locale}
          currentMonth={currentMonth}
          inSeasonCount={rows.length}
          produce={firstInSeason(rows)}
          photo={getHeroPhoto()}
        />
        <div className={styles.season}>
          <h2 className={styles.inSeasonHeading}>{copy.home.inSeason}</h2>
          <CardGrid
            produce={rows}
            locale={locale}
            currentMonth={currentMonth}
            selectedMonth={currentMonth}
            kind={null}
          />
        </div>
        <div className={styles.notice}>
          <SampleDataNotice locale={locale} />
        </div>
      </div>
    </PageShell>
  );
}
