import type { Locale } from "./config";

const PATH_REJECTED = "locale path rejected";

export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

export function localeHref(locale: Locale, path: string): string {
  if (path !== "" && !path.startsWith("/")) {
    throw new Error(PATH_REJECTED);
  }
  return `/${locale}${path}`;
}
