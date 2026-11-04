import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { guideHref } from "@/modules/guide";
import {
  catalogueMonth,
  ProducePhoto,
  type CalendarMonth,
  type Produce,
  type ProducePhotoRow,
} from "@/modules/produce";
import { SeasonDial } from "./SeasonDial";
import styles from "./Hero.module.css";

export function Hero({
  locale,
  currentMonth,
  inSeasonCount,
  produce,
  photo,
}: {
  locale: Locale;
  currentMonth: CalendarMonth;
  inSeasonCount: number;
  produce: Produce;
  photo: ProducePhotoRow | undefined;
}) {
  const copy = messages(locale);
  const monthName = catalogueMonth(copy.months, currentMonth);
  return (
    <div className={styles.hero}>
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
      <Link className={styles.guide} href={guideHref(locale, currentMonth, null)}>
        {copy.home.guideLink}
      </Link>
    </div>
  );
}
