"use client";

import { defaultLocale, directionOf } from "@/i18n/config";
import { messages } from "@/i18n/messages";

const copy = messages(defaultLocale);

export default function GlobalError({
  retry,
}: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  return (
    <html lang={defaultLocale} dir={directionOf(defaultLocale)}>
      <body>
        <main>
          <h1>{copy.error.title}</h1>
          <button type="button" onClick={() => retry()}>
            {copy.error.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
