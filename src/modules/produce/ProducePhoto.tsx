import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { otherLocale } from "@/i18n/href";
import type { CalendarMonth } from "../../domain";
import type { Produce } from "./catalogue";
import type { ProducePhotoRow } from "./photos";
import { SeasonRing } from "./SeasonRing";
import styles from "./ProducePhoto.module.css";

const sizesBySlot = {
  card: "(min-width: 64rem) 25vw, 50vw",
  page: "(min-width: 64rem) 50vw, 100vw",
  hero: "100vw",
} as const;

const slotClass = {
  card: styles.card,
  page: styles.page,
  hero: styles.hero,
} as const;

function altText(photo: ProducePhotoRow, locale: Locale): string {
  const byLocale: Record<Locale, string> = {
    en: photo.alt_en,
    ar: photo.alt_ar,
  };
  return byLocale[locale];
}

export function ProducePhoto({
  produce,
  photo,
  locale,
  slot,
  priority = false,
  currentMonth,
}: {
  produce: Produce;
  photo: ProducePhotoRow | undefined;
  locale: Locale;
  slot: "card" | "page" | "hero";
  priority?: boolean;
  currentMonth?: CalendarMonth;
}) {
  const frameClass = `${styles.frame} ${slotClass[slot]}`;
  if (photo) {
    const image = {
      src: photo.file,
      width: photo.width,
      height: photo.height,
      sizes: sizesBySlot[slot],
      className: styles.photo,
    };
    const alt = altText(photo, locale);
    return (
      <div className={frameClass}>
        {priority ? <Image {...image} alt={alt} priority /> : <Image {...image} alt={alt} loading="lazy" />}
      </div>
    );
  }
  const other = otherLocale(locale);
  return (
    <div className={frameClass}>
      <div className={styles.tile} data-kind={produce.kind}>
        <div className={styles.dial}>
          <SeasonRing kind={produce.kind} months={produce.months} currentMonth={currentMonth} />
          <div className={styles.copy}>
            <p className={styles.name}>
              <bdi>{produce[locale]}</bdi>
            </p>
            <p className={styles.counter} lang={other}>
              <bdi>{produce[other]}</bdi>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
