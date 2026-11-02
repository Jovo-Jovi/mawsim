import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref, otherLocale } from "@/i18n/href";
import { messages } from "@/i18n/messages";
import styles from "./Wordmark.module.css";

export function Wordmark({ locale }: { locale: Locale }) {
  const other = otherLocale(locale);
  return (
    <Link className={styles.mark} href={localeHref(locale, "")}>
      <span className={styles.name}>{messages(locale).app.name}</span>
      <span className={styles.counter} lang={other}>
        <bdi>{messages(other).app.name}</bdi>
      </span>
    </Link>
  );
}
