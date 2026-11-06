import Link from "next/link";
import type { CSSProperties } from "react";
import { calendarMonths, type CalendarMonth } from "../../domain";
import type { Locale } from "@/i18n/config";
import { directionOf } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { guideHref } from "@/modules/guide";
import {
  catalogueMonth,
  dialViewBoxSize,
  getHeroPhoto,
  getProducePhoto,
  inSeasonIn,
  listProduce,
  MarketTexture,
  orbitPlace,
  ProducePhoto,
  storyOrbitBandRatio,
  YearDial,
  type ProducePhotoRow,
} from "@/modules/produce";
import styles from "./YearStory.module.css";

function orbitOffset(coordinate: number): string {
  const ratio = ((coordinate - dialViewBoxSize / 2) / dialViewBoxSize) * 100;
  return `${ratio.toFixed(4)}cqi`;
}

function storySentence(locale: Locale, calendarMonth: CalendarMonth): string {
  const copy = messages(locale);
  const numeral = new Intl.NumberFormat(locale).format(inSeasonIn(calendarMonth).length);
  return copy.home.storyCount
    .replaceAll("{month}", catalogueMonth(copy.months, calendarMonth))
    .replaceAll("{count}", numeral);
}

export function YearStory({
  locale,
  currentMonth,
  texture,
}: {
  locale: Locale;
  currentMonth: CalendarMonth;
  texture: ProducePhotoRow | undefined;
}) {
  const copy = messages(locale);
  const direction = directionOf(locale);
  const produce = listProduce();
  const fallback = produce[0];
  if (!fallback) throw new Error("catalogue is empty");
  const forward = new Set(inSeasonIn(currentMonth).map((row) => row.slug));
  const orbitRadius = (dialViewBoxSize / 2) * (1 - storyOrbitBandRatio);
  const objectStyle = { "--orbit-span": `${storyOrbitBandRatio * 100}%` } as CSSProperties;
  return (
    <div className={styles.band} data-texture-band="hero">
      <MarketTexture photo={texture} />
      <div className={styles.copy}>
        <h1 className={styles.headline}>
          {copy.home.headline}{" "}
          <span className={`${styles.stack} ${styles.month}`}>
            {calendarMonths.map((calendarMonth) => {
              const shown = calendarMonth === currentMonth;
              return (
                <span key={calendarMonth} aria-hidden={shown ? undefined : true}>
                  {catalogueMonth(copy.months, calendarMonth)}
                </span>
              );
            })}
          </span>
        </h1>
        <p className={styles.count}>
          <span className={styles.stack}>
            {calendarMonths.map((calendarMonth) => {
              const shown = calendarMonth === currentMonth;
              return (
                <span key={calendarMonth} aria-hidden={shown ? undefined : true}>
                  {storySentence(locale, calendarMonth)}
                </span>
              );
            })}
          </span>
        </p>
        <Link className={styles.guide} href={guideHref(locale, currentMonth, null)}>
          {copy.home.guideLink}
        </Link>
      </div>
      <div className={styles.object} style={objectStyle}>
        <div className={styles.seat}>
          <YearDial
            selected={currentMonth}
            currentMonth={currentMonth}
            direction={direction}
            story
            centre={
              <div data-hero-photo="">
                <ProducePhoto
                  produce={fallback}
                  photo={getHeroPhoto()}
                  locale={locale}
                  slot="hero"
                  priority
                />
              </div>
            }
            label={(calendarMonth) => (
              <span className={styles.dialName}>{catalogueMonth(copy.monthsShort, calendarMonth)}</span>
            )}
          />
        </div>
        <div className={styles.orbit}>
          {produce.map((row, index) => {
            const point = orbitPlace(index, produce.length, orbitRadius, direction);
            const place = {
              "--orbit-x": orbitOffset(point.x),
              "--orbit-y": orbitOffset(point.y),
            } as CSSProperties;
            const shown = forward.has(row.slug);
            return (
              <div key={row.slug} className={styles.place} style={place}>
                <div
                  className={shown ? styles.forward : styles.back}
                  data-story-produce={row.slug}
                  data-story-forward={shown ? "" : undefined}
                >
                  <ProducePhoto produce={row} photo={getProducePhoto(row.slug)} locale={locale} slot="orbit" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
