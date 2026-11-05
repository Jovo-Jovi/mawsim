import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { getProduceBySlug } from "./catalogue";
import type { ProducePhotoRow } from "./photos";
import styles from "./PhotoCredits.module.css";

const MISSING_PRODUCE = "photo credit: produce is missing";
const MISSING_AUTHOR = "photo credit: author placeholder is missing";

function produceSubject(slug: string, locale: Locale): string {
  const row = getProduceBySlug(slug);
  if (!row) throw new Error(MISSING_PRODUCE);
  return row[locale];
}

function authorLine(template: string, author: string): ReactNode {
  const parts = template.split("{author}");
  if (parts.length !== 2) throw new Error(MISSING_AUTHOR);
  const [before, after] = parts;
  return (
    <>
      {before}
      <bdi>{author}</bdi>
      {after}
    </>
  );
}

export function PhotoCredits({
  locale,
  credits,
}: {
  locale: Locale;
  credits: readonly ProducePhotoRow[];
}) {
  const copy = messages(locale);
  if (credits.length === 0) {
    return <p className={styles.none}>{copy.about.photosNone}</p>;
  }
  return (
    <ul className={styles.list}>
      {credits.map((row) => {
        const subject = row.key === "hero" ? copy.about.photoHero : produceSubject(row.key, locale);
        return (
          <li key={row.key} className={styles.credit}>
            <p className={styles.subject}>{subject}</p>
            <p className={styles.by}>{authorLine(copy.about.photoBy, row.author)}</p>
            <div className={styles.actions}>
              <a className={styles.link} href={row.source_url} rel="noreferrer">
                {copy.about.photoSource}
              </a>
              <span className={styles.licence}>
                {copy.about.photoLicence}
                <a className={styles.link} href={row.licence_url} rel="noreferrer">
                  <bdi>{row.licence}</bdi>
                </a>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
