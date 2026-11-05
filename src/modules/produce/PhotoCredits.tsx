import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { getProduceBySlug } from "./catalogue";
import type { ProducePhotoRow } from "./photos";
import styles from "./PhotoCredits.module.css";

const MISSING_PRODUCE = "photo credit: produce is missing";
const MISSING_AUTHOR = "photo credit: author placeholder is missing";
const MISSING_MODEL = "photo credit: model placeholder is missing";

function produceSubject(slug: string, locale: Locale): string {
  const row = getProduceBySlug(slug);
  if (!row) throw new Error(MISSING_PRODUCE);
  return row[locale];
}

function creditSubject(key: string, locale: Locale, hero: string, texture: string): string {
  if (key === "hero") return hero;
  if (key === "texture") return texture;
  return produceSubject(key, locale);
}

function isolatedValue(template: string, token: string, value: string, missing: string): ReactNode {
  const parts = template.split(token);
  if (parts.length !== 2) throw new Error(missing);
  const [before, after] = parts;
  return (
    <>
      {before}
      <bdi>{value}</bdi>
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
        const subject = creditSubject(row.key, locale, copy.about.photoHero, copy.about.photoTexture);
        return (
          <li key={row.key} className={styles.credit}>
            <p className={styles.subject}>{subject}</p>
            {row.source === "generated" ? (
              <>
                <p className={styles.by}>
                  {isolatedValue(copy.about.photoGenerated, "{model}", row.model, MISSING_MODEL)}
                </p>
                <div className={styles.actions}>
                  <a className={styles.link} href={row.terms_url} rel="noreferrer">
                    {copy.about.photoTerms}
                  </a>
                </div>
              </>
            ) : null}
            {row.source === "licensed" ? (
              <>
                <p className={styles.by}>
                  {isolatedValue(copy.about.photoBy, "{author}", row.author, MISSING_AUTHOR)}
                </p>
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
              </>
            ) : null}
            {row.source === "own" ? (
              <p className={styles.by}>
                {isolatedValue(copy.about.photoOwn, "{author}", row.author, MISSING_AUTHOR)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
