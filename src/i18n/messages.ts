import type { Locale } from "./config";
import ar from "./messages/ar.json";
import en from "./messages/en.json";

const catalogues = { ar, en } satisfies Record<Locale, typeof en>;

export function messages(locale: Locale) {
  return catalogues[locale];
}
