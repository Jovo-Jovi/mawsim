import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/i18n/href";
import { messages } from "@/i18n/messages";
import { LanguageLink } from "./LanguageLink";
import { Wordmark } from "./Wordmark";
import styles from "./SiteHeader.module.css";

export function SiteHeader({
  locale,
  path,
  query = "",
}: {
  locale: Locale;
  path: string;
  query?: string;
}) {
  const copy = messages(locale);
  const home = path === "";
  const guide = path === "/guide";
  const about = path === "/about";
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <div className={styles.brand}>
          <Wordmark locale={locale} />
        </div>
        <nav className={styles.nav} aria-label={copy.nav.label}>
          <Link
            className={home ? `${styles.link} ${styles.current}` : styles.link}
            href={localeHref(locale, "")}
            aria-current={home ? "page" : undefined}
          >
            {copy.nav.home}
          </Link>
          <Link
            className={guide ? `${styles.link} ${styles.current}` : styles.link}
            href={localeHref(locale, "/guide")}
            aria-current={guide ? "page" : undefined}
          >
            {copy.nav.guide}
          </Link>
          <Link
            className={about ? `${styles.link} ${styles.current}` : styles.link}
            href={localeHref(locale, "/about")}
            aria-current={about ? "page" : undefined}
          >
            {copy.nav.about}
          </Link>
        </nav>
        <div className={styles.language}>
          <LanguageLink locale={locale} path={path} query={query} />
        </div>
      </div>
    </header>
  );
}
