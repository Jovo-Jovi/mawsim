import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageShell } from "@/components/PageShell";
import { localeHref } from "@/i18n/href";
import { localeParamOrDefault } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import styles from "./not-found.module.css";

export default async function NotFoundPage() {
  const locale = await localeParamOrDefault();
  const copy = messages(locale);
  return (
    <PageShell locale={locale} path="">
      <h1>{copy.notFound.title}</h1>
      <p>{copy.notFound.body}</p>
      <Link className={styles.home} href={localeHref(locale, "")}>
        <Icon name="arrow" />
        {copy.notFound.home}
      </Link>
    </PageShell>
  );
}
