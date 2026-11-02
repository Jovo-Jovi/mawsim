import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { Icon } from "./Icon";
import styles from "./SampleDataNotice.module.css";

export function SampleDataNotice({ locale }: { locale: Locale }) {
  return (
    <div className={styles.band}>
      <div className={styles.row}>
        <span className={styles.glyph}>
          <Icon name="notice" />
        </span>
        <p className={styles.text}>{messages(locale).notice.sample}</p>
      </div>
    </div>
  );
}
