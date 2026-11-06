import type { CSSProperties } from "react";
import { calendarMonths, type CalendarMonth } from "../../domain";
import type { Locale } from "@/i18n/config";
import { directionOf } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { guideHref } from "@/modules/guide";
import {
  catalogueMonth,
  dialTurnDegrees,
  dialViewBoxSize,
  getHeroPhoto,
  getProducePhoto,
  inSeasonIn,
  listProduce,
  MarketTexture,
  orbitPlace,
  ProducePhoto,
  storyOrbitBandRatio,
  storyOrbitBandRatioWide,
  storyOrbitCentreRadius,
  YearDial,
  type ProducePhotoRow,
} from "@/modules/produce";
import styles from "./YearStory.module.css";
import { YearStoryMotion } from "./YearStoryMotion";

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
  const narrowRadius = storyOrbitCentreRadius(storyOrbitBandRatio);
  const wideRadius = storyOrbitCentreRadius(storyOrbitBandRatioWide);
  const objectStyle = {
    "--orbit-band": storyOrbitBandRatio.toFixed(4),
    "--orbit-band-wide": storyOrbitBandRatioWide.toFixed(4),
  } as CSSProperties;
  return (
    <YearStoryMotion
      dialTurnDegrees={calendarMonths.map((calendarMonth) => dialTurnDegrees(calendarMonth, direction))}
      guideHrefs={calendarMonths.map((calendarMonth) => guideHref(locale, calendarMonth, null))}
      seasons={produce.map((row) => row.months)}
    >
      <div className={styles.band} data-texture-band="hero">
        <MarketTexture photo={texture} />
        <div className={styles.stage}>
          <div className={styles.copy}>
            <h1 className={styles.headline}>
              {copy.home.headline}{" "}
              <span className={`${styles.stack} ${styles.month}`}>
                {calendarMonths.map((calendarMonth) => {
                  const shown = calendarMonth === currentMonth;
                  return (
                    <span
                      key={calendarMonth}
                      data-story-slot="month"
                      data-story-month={calendarMonth}
                      aria-hidden={shown ? undefined : true}
                    >
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
                    <span
                      key={calendarMonth}
                      data-story-slot="count"
                      data-story-month={calendarMonth}
                      aria-hidden={shown ? undefined : true}
                    >
                      {storySentence(locale, calendarMonth)}
                    </span>
                  );
                })}
              </span>
            </p>
            <a className={styles.guide} href={guideHref(locale, currentMonth, null)}>
              {copy.home.guideLink}
            </a>
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
                const narrow = orbitPlace(index, produce.length, narrowRadius, direction);
                const wide = orbitPlace(index, produce.length, wideRadius, direction);
                const place = {
                  "--orbit-x": orbitOffset(narrow.x),
                  "--orbit-y": orbitOffset(narrow.y),
                  "--orbit-x-wide": orbitOffset(wide.x),
                  "--orbit-y-wide": orbitOffset(wide.y),
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
      </div>
    </YearStoryMotion>
  );
}
