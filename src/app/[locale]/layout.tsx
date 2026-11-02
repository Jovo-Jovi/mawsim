import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { defaultLocale, directionOf, isLocale, locales } from "@/i18n/config";
import { localeSegment } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";
import NotFoundPage from "./not-found";
import "../globals.css";

function RaiseNotFound(): never {
  notFound();
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const value = await localeSegment();
  const locale = isLocale(value) ? value : defaultLocale;
  const copy = messages(locale);
  return {
    title: copy.app.name,
    description: copy.app.tagline,
  };
}

export default async function LocaleLayout({ children }: { children: ReactNode }) {
  const value = await localeSegment();
  const locale = isLocale(value) ? value : defaultLocale;
  return (
    <html lang={locale} dir={directionOf(locale)}>
      <body>
        {isLocale(value) ? (
          <Suspense>{children}</Suspense>
        ) : (
          <>
            <NotFoundPage />
            <Suspense>
              <RaiseNotFound />
            </Suspense>
          </>
        )}
      </body>
    </html>
  );
}
