import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localeHref } from "@/i18n/href";
import { messages } from "@/i18n/messages";
import { Icon } from "./Icon";
import styles from "./NotFoundCopy.module.css";

export function NotFoundCopy({ locale }: { locale: Locale }) {
  const copy = messages(locale);
  return (
    <>
      <h1>{copy.notFound.title}</h1>
      <p>{copy.notFound.body}</p>
      <div className={styles.actions}>
        <Link className={styles.home} href={localeHref(locale, "")}>
          <Icon name="arrow" />
          {copy.notFound.home}
        </Link>
        <Link className={styles.guide} href={localeHref(locale, "/guide")}>
          {copy.notFound.guide}
        </Link>
      </div>
    </>
  );
}
