import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import styles from "./PageShell.module.css";

export function PageShell({
  locale,
  path,
  query = "",
  children,
}: {
  locale: Locale;
  path: string;
  query?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <a className={styles.skip} href="#content">
          {messages(locale).skip.content}
        </a>
        <SiteHeader locale={locale} path={path} query={query} />
      </div>
      <main id="content" tabIndex={-1} className={styles.main}>
        <div className={styles.frame}>{children}</div>
      </main>
      <SiteFooter locale={locale} path={path} query={query} />
    </div>
  );
}
