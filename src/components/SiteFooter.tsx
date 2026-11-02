import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { LanguageLink } from "./LanguageLink";
import { SampleDataNotice } from "./SampleDataNotice";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ locale, path }: { locale: Locale; path: string }) {
  return (
    <footer className={styles.footer}>
      <SampleDataNotice locale={locale} />
      <div className={styles.bar}>
        <p className={styles.line}>{messages(locale).footer.collectsNothing}</p>
        <LanguageLink locale={locale} path={path} />
      </div>
    </footer>
  );
}
