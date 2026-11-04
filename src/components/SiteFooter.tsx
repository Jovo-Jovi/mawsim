import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/i18n/href";
import { messages } from "@/i18n/messages";
import { LanguageLink } from "./LanguageLink";
import { SampleDataNotice } from "./SampleDataNotice";
import styles from "./SiteFooter.module.css";

export function SiteFooter({
  locale,
  path,
  query = "",
}: {
  locale: Locale;
  path: string;
  query?: string;
}) {
  const copy = messages(locale);
  const about = path === "/about";
  return (
    <footer className={styles.footer}>
      <SampleDataNotice locale={locale} />
      <div className={styles.bar}>
        <p className={styles.line}>{copy.footer.collectsNothing}</p>
        <div className={styles.end}>
          <Link
            className={styles.about}
            href={localeHref(locale, "/about")}
            aria-current={about ? "page" : undefined}
          >
            {copy.nav.about}
          </Link>
          <LanguageLink locale={locale} path={path} query={query} />
        </div>
      </div>
    </footer>
  );
}
