import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import type { Produce } from "./catalogue";
import styles from "./StorageTipPanel.module.css";

const tipFor: Record<Locale, (produce: Produce) => string> = {
  en: (produce) => produce.tip_en,
  ar: (produce) => produce.tip_ar,
};

export function StorageTipPanel({ produce, locale }: { produce: Produce; locale: Locale }) {
  const copy = messages(locale);
  return (
    <div className={styles.panel}>
      <p className={styles.overline}>{copy.produce.keepIt}</p>
      <p className={styles.tip}>{tipFor[locale](produce)}</p>
    </div>
  );
}
