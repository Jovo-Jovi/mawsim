import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref, otherLocale } from "@/i18n/href";
import { messages } from "@/i18n/messages";
import styles from "./LanguageLink.module.css";

export function LanguageLink({
  locale,
  path,
  query = "",
}: {
  locale: Locale;
  path: string;
  query?: string;
}) {
  const target = otherLocale(locale);
  return (
    <Link className={styles.link} href={localeHref(target, path + query)} hrefLang={target} lang={target}>
      <bdi>{messages(locale).language.switch}</bdi>
    </Link>
  );
}
