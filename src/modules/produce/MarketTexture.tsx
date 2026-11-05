import Image from "next/image";
import { useId } from "react";
import type { ProducePhotoRow } from "./photos";
import styles from "./MarketTexture.module.css";

const WARP = "M0 0 H12 M0 4 H12 M0 8 H12 M0 12 H12 M0 0 V12 M4 0 V12 M8 0 V12 M12 0 V12";
const WEFT = "M0 2 H12 M0 6 H12 M0 10 H12 M2 0 V12 M6 0 V12 M10 0 V12";

export function MarketTexture({ photo }: { photo: ProducePhotoRow | undefined }) {
  const patternId = `weave${useId().replaceAll(/[^A-Za-z0-9_-]/g, "")}`;
  return (
    <div className={styles.layer} aria-hidden="true">
      {photo ? (
        <Image src={photo.file} alt="" fill sizes="100vw" loading="lazy" className={styles.cover} />
      ) : (
        <svg className={styles.weave} width="100%" height="100%" focusable="false">
          <defs>
            <pattern
              id={patternId}
              width="var(--texture-tile)"
              height="var(--texture-tile)"
              patternUnits="userSpaceOnUse"
            >
              <svg viewBox="0 0 12 12" width="var(--texture-tile)" height="var(--texture-tile)">
                <path d={WARP} fill="none" stroke="var(--texture-ink)" strokeWidth="0.07" />
                <path d={WEFT} fill="none" stroke="var(--texture-ink)" strokeWidth="0.04" />
              </svg>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      )}
    </div>
  );
}
