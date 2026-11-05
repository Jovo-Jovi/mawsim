import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { guideHref } from "@/modules/guide";
import {
  catalogueMonth,
  MarketTexture,
  ProducePhoto,
  type CalendarMonth,
  type Produce,
  type ProducePhotoRow,
} from "@/modules/produce";
import { HeroSceneFrame } from "./HeroSceneFrame";
import { SeasonDial } from "./SeasonDial";
import styles from "./Hero.module.css";

export function Hero({
  locale,
  currentMonth,
  inSeasonCount,
  produce,
  photo,
  texture,
}: {
  locale: Locale;
  currentMonth: CalendarMonth;
  inSeasonCount: number;
  produce: Produce;
  photo: ProducePhotoRow | undefined;
  texture: ProducePhotoRow | undefined;
}) {
  const copy = messages(locale);
  const monthName = catalogueMonth(copy.months, currentMonth);
  return (
    <div className={styles.hero} data-texture-band="hero">
      <MarketTexture photo={texture} />
      <h1 className={styles.headline}>
        {copy.home.headline}{" "}
        <span className={styles.month}>{monthName}</span>
      </h1>
      <div className={styles.stage}>
        <ProducePhoto
          produce={produce}
          photo={photo}
          locale={locale}
          slot="hero"
          priority
          currentMonth={currentMonth}
        />
      </div>
      <SeasonDial locale={locale} currentMonth={currentMonth} inSeasonCount={inSeasonCount} />
      <div className={styles.scene}>
        <HeroSceneFrame label={copy.home.sceneLabel} pause={copy.home.scenePause} play={copy.home.scenePlay} />
      </div>
      <Link className={styles.guide} href={guideHref(locale, currentMonth, null)}>
        {copy.home.guideLink}
      </Link>
    </div>
  );
}
