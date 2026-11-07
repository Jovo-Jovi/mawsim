import type { Metadata } from "next";
import { NotFoundCopy } from "@/components/NotFoundCopy";
import { PageShell } from "@/components/PageShell";
import { defaultLocale, directionOf } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { fontVariableClass } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: messages(defaultLocale).notFound.title,
};

export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale} dir={directionOf(defaultLocale)} className={fontVariableClass} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- OD-12 §4: the theme is set before first paint */}
        <script src="/theme-init.js" />
      </head>
      <body>
        <PageShell locale={defaultLocale} path="">
          <NotFoundCopy locale={defaultLocale} />
        </PageShell>
      </body>
    </html>
  );
}
