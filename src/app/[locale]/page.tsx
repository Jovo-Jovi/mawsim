import { PageShell } from "@/components/PageShell";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { localeParam } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import { CardGrid } from "@/modules/guide";
import { YearStory } from "@/modules/home";
import { getTexturePhoto, inSeasonIn, MarketTexture, thisCalendarMonth } from "@/modules/produce";
import styles from "./page.module.css";

export default async function HomePage() {
  const locale = await localeParam();
  const currentMonth = await thisCalendarMonth();
  const rows = inSeasonIn(currentMonth);
  const copy = messages(locale);
  const texture = getTexturePhoto();
  return (
    <PageShell locale={locale} path="">
      <div className={styles.page}>
        <YearStory locale={locale} currentMonth={currentMonth} texture={texture} />
        <div className={styles.season}>
          <div className={styles.headingBand} data-texture-band="heading">
            <MarketTexture photo={texture} />
            <h2 className={styles.inSeasonHeading}>{copy.home.inSeason}</h2>
          </div>
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
