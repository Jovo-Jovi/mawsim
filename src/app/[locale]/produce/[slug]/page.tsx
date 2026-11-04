import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { SampleDataNotice } from "@/components/SampleDataNotice";
import type { Locale } from "@/i18n/config";
import { localeHref, otherLocale } from "@/i18n/href";
import { localeParam, localeSegment } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import {
  getProduceBySlug,
  getProducePhoto,
  listProduce,
  ProducePhoto,
  SeasonBar,
  seasonSentence,
  StorageTipPanel,
  thisCalendarMonth,
  type Produce,
} from "@/modules/produce";
import styles from "./page.module.css";

// A partial shell streams 200 before notFound() can set the status.
// "navigation" waits, so an unknown slug answers 404.
export const ensureStatic = "navigation";

function kindLabel(produce: Produce, locale: Locale): string {
  const labels = messages(locale).kind;
  const table: Record<Produce["kind"], string> = {
    fruit: labels.fruit,
    vegetable: labels.vegetable,
    leafy: labels.leafy,
  };
  return table[produce.kind];
}

function produceForSlug(slug: string): Produce {
  const found = getProduceBySlug(slug);
  if (!found) notFound();
  return found;
}

export async function generateStaticParams() {
  await localeSegment();
  return listProduce().map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const locale = await localeParam();
  const { slug } = await params;
  const produce = produceForSlug(slug);
  const copy = messages(locale);
  const other = otherLocale(locale);
  return {
    title: `${produce[locale]}${copy.app.titleJoin}${copy.app.name}`,
    description: seasonSentence(produce, locale),
    alternates: {
      languages: {
        [other]: localeHref(other, `/produce/${produce.slug}`),
      },
    },
  };
}

export default async function ProducePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const locale = await localeParam();
  const { slug } = await params;
  const produce = produceForSlug(slug);
  const currentMonth = await thisCalendarMonth();
  const other = otherLocale(locale);
  return (
    <PageShell locale={locale} path={`/produce/${produce.slug}`}>
      <article className={styles.page}>
        <div className={styles.sheet}>
          <header className={styles.identity}>
            <p className={styles.overline}>{kindLabel(produce, locale)}</p>
            <h1><bdi>{produce[locale]}</bdi></h1>
            <p className={styles.counter} lang={other}><bdi>{produce[other]}</bdi></p>
          </header>
          <div className={styles.photo}>
            <ProducePhoto
              produce={produce}
              photo={getProducePhoto(produce.slug)}
              locale={locale}
              slot="page"
              priority
              currentMonth={currentMonth}
            />
          </div>
          <div className={styles.bar}>
            <SeasonBar produce={produce} locale={locale} currentMonth={currentMonth} />
          </div>
          <div className={styles.keep}>
            <StorageTipPanel produce={produce} locale={locale} />
          </div>
        </div>
        <div className={styles.notice}>
          <SampleDataNotice locale={locale} />
        </div>
      </article>
    </PageShell>
  );
}
