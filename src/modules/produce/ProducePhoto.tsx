import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { otherLocale } from "@/i18n/href";
import type { CalendarMonth } from "../../domain";
import type { Produce } from "./catalogue";
import {
  arcDiscShare,
  arcRingDiameterShare,
  ringInnerEdgeRadius,
  ringOuterEdgeRadius,
  storyOrbitBandRatio,
  storyOrbitBandRatioWide,
} from "./dial-geometry";
import type { ProducePhotoRow } from "./photos";
import styles from "./ProducePhoto.module.css";

function wholeRem(value: number): number {
  return Math.ceil(value - 1e-9);
}

/** `--arc-size` is 18rem, and 24rem from 64rem. The disc share is rounded up to a whole rem. */
const pageDiscNarrow = wholeRem(18 * arcRingDiameterShare * arcDiscShare);
const pageDiscWide = wholeRem(24 * arcRingDiameterShare * arcDiscShare);

/**
 * The hero disc is the story dial's centre (`YearDial.module.css`): the ring is 58% of the
 * dial, then the centre sits inside the inner edge by half the 1.6 tick and 0.25% of the dial.
 * `--dial-size` is 20rem, 28rem from 40rem, and 34rem from 64rem. The story dial keeps the
 * orbit band outside that. Rounded up to a whole rem, the same way as the page disc.
 */
const heroCentreShare =
  0.58 * ((ringInnerEdgeRadius - 1.6 / 2) / ringOuterEdgeRadius) - 0.0025;
const heroDiscNarrow = wholeRem(20 * (1 - 2 * storyOrbitBandRatio) * heroCentreShare);
const heroDiscMid = wholeRem(28 * (1 - 2 * storyOrbitBandRatio) * heroCentreShare);
const heroDiscWide = wholeRem(34 * (1 - 2 * storyOrbitBandRatioWide) * heroCentreShare);

const sizesBySlot = {
  card: "(min-width: 64rem) 20vw, 40vw",
  page: `(min-width: 64rem) ${pageDiscWide}rem, ${pageDiscNarrow}rem`,
  hero: `(min-width: 64rem) ${heroDiscWide}rem, (min-width: 40rem) ${heroDiscMid}rem, ${heroDiscNarrow}rem`,
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
}: {
  produce: Produce;
  photo: ProducePhotoRow | undefined;
  locale: Locale;
  slot: "card" | "page" | "hero" | "orbit";
  priority?: boolean;
  /** Accepted until T23. The page arc draws the tick; this slot no longer reads it. */
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
  return (
    <div className={frameClass}>
      <div className={styles.tile} data-kind={produce.kind}>
        {names}
      </div>
    </div>
  );
}
