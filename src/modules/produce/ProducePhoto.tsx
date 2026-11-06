import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { otherLocale } from "@/i18n/href";
import type { CalendarMonth } from "../../domain";
import type { Produce } from "./catalogue";
import type { ProducePhotoRow } from "./photos";
import { SeasonRing } from "./SeasonRing";
import styles from "./ProducePhoto.module.css";

const sizesBySlot = {
  card: "(min-width: 64rem) 20vw, 40vw",
  page: "(min-width: 64rem) 50vw, 100vw",
  hero: "100vw",
  orbit: "6rem",
} as const;

const slotClass = {
  card: styles.card,
  page: styles.page,
  hero: styles.hero,
  orbit: styles.orbit,
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
  slot: "card" | "page" | "hero" | "orbit";
  priority?: boolean;
  currentMonth?: CalendarMonth;
}) {
  const frameClass = `${styles.frame} ${slotClass[slot]}`;
  const decorative = slot === "orbit";
  if (photo) {
    const image = {
      src: photo.file,
      width: photo.width,
      height: photo.height,
      sizes: sizesBySlot[slot],
      className: styles.photo,
    };
    const alt = decorative ? "" : altText(photo, locale);
    return (
      <div className={frameClass} aria-hidden={decorative ? true : undefined}>
        {priority && !decorative ? (
          <Image {...image} alt={alt} priority />
        ) : (
          <Image {...image} alt={alt} loading="lazy" />
        )}
      </div>
    );
  }
  if (decorative) {
    return (
      <div className={frameClass} aria-hidden="true">
        <div className={styles.tile} data-kind={produce.kind} />
      </div>
    );
  }
  const other = otherLocale(locale);
  const names = (
    <div className={styles.copy}>
      <p className={styles.name}>
        <bdi>{produce[locale]}</bdi>
      </p>
      <p className={styles.counter} lang={other}>
        <bdi>{produce[other]}</bdi>
      </p>
    </div>
  );
  if (slot === "card" || slot === "hero") {
    return (
      <div className={frameClass}>
        <div className={styles.tile} data-kind={produce.kind}>
          {names}
        </div>
      </div>
    );
  }
  return (
    <div className={frameClass}>
      <div className={styles.tile} data-kind={produce.kind}>
        <div className={styles.dial}>
          <SeasonRing kind={produce.kind} months={produce.months} currentMonth={currentMonth} />
          {names}
        </div>
      </div>
    </div>
  );
}
