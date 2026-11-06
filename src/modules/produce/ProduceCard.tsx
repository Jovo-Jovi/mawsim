import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref, otherLocale } from "@/i18n/href";
import { messages } from "@/i18n/messages";
import type { CalendarMonth, ProduceKind } from "../../domain";
import type { Produce } from "./catalogue";
import { ProducePhoto } from "./ProducePhoto";
import type { ProducePhotoRow } from "./photos";
import { SeasonRing } from "./SeasonRing";
import { seasonSentence } from "./season-sentence";
import styles from "./ProduceCard.module.css";

const nameIn: Record<Locale, (produce: Produce) => string> = {
  en: (produce) => produce.en,
  ar: (produce) => produce.ar,
};

function kindLabel(kind: ProduceKind, locale: Locale): string {
  const labels = messages(locale).kind;
  const table: Record<ProduceKind, string> = {
    fruit: labels.fruit,
    vegetable: labels.vegetable,
    leafy: labels.leafy,
  };
  return table[kind];
}

export function ProduceCard({
  produce,
  photo,
  locale,
  currentMonth,
}: {
  produce: Produce;
  photo: ProducePhotoRow | undefined;
  locale: Locale;
  currentMonth: CalendarMonth;
}) {
  const other = otherLocale(locale);
  return (
    <Link className={styles.card} href={localeHref(locale, `/produce/${produce.slug}`)}>
      <div className={styles.frame}>
        <div className={styles.ring} data-season-ring>
          <SeasonRing kind={produce.kind} months={produce.months} currentMonth={currentMonth} />
        </div>
        <div className={styles.circle} data-photo-circle aria-hidden={photo ? undefined : true}>
          <ProducePhoto
            produce={produce}
            photo={photo}
            locale={locale}
            slot="card"
            currentMonth={currentMonth}
          />
        </div>
      </div>
      <div className={styles.copy}>
        <h2 className={styles.name}><bdi>{nameIn[locale](produce)}</bdi></h2>
        <p className={styles.counter} lang={other}><bdi>{nameIn[other](produce)}</bdi></p>
        <p className={styles.kind}>{kindLabel(produce.kind, locale)}</p>
        <p className={styles.sentence}>{seasonSentence(produce, locale)}</p>
      </div>
    </Link>
  );
}
