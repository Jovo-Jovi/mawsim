import { notFound } from "next/navigation";
import { locale as readLocale } from "next/root-params";
import { defaultLocale, isLocale, type Locale } from "./config";

export async function localeSegment(): Promise<string> {
  return readLocale();
}

export async function localeParam(): Promise<Locale> {
  const value = await readLocale();
  if (!isLocale(value)) notFound();
  return value;
}

export async function localeParamOrDefault(): Promise<Locale> {
  const value = await readLocale();
  return isLocale(value) ? value : defaultLocale;
}
