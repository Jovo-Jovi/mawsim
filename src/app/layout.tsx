import type { Metadata } from "next";
import type { ReactNode } from "react";
import { defaultLocale, directionOf } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import "./globals.css";

const copy = messages(defaultLocale);

export const metadata: Metadata = {
  title: copy.app.name,
  description: copy.app.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={defaultLocale} dir={directionOf(defaultLocale)}>
      <body>{children}</body>
    </html>
  );
}
