import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import { localeHref, otherLocale } from "@/i18n/href";
import { localeParam } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import { listPhotoCredits, PhotoCredits } from "@/modules/produce";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await localeParam();
  const copy = messages(locale);
  const other = otherLocale(locale);
  return {
    title: `${copy.nav.about}${copy.app.titleJoin}${copy.app.name}`,
    description: copy.app.tagline,
    alternates: {
      languages: {
        [other]: localeHref(other, "/about"),
      },
    },
  };
}

export default async function AboutPage() {
  const locale = await localeParam();
  const copy = messages(locale);
  return (
    <PageShell locale={locale} path="/about">
      <div className={styles.page}>
        <h1>{copy.about.title}</h1>
        <section className={styles.section}>
          <h2>{copy.about.whatTitle}</h2>
          <div className={styles.copy}>
            <p>{copy.about.what}</p>
          </div>
        </section>
        <section className={styles.section}>
          <h2>{copy.about.collectsTitle}</h2>
          <div className={styles.copy}>
            <p>{copy.about.collects}</p>
          </div>
        </section>
        <section className={styles.section}>
          <h2>{copy.about.languagesTitle}</h2>
          <div className={styles.copy}>
            <p>{copy.about.languages}</p>
          </div>
        </section>
        <section className={styles.section}>
          <h2>{copy.about.photosTitle}</h2>
          <PhotoCredits locale={locale} credits={listPhotoCredits()} />
        </section>
        <div className={styles.notice}>
          <SampleDataNotice locale={locale} />
        </div>
      </div>
    </PageShell>
  );
}
