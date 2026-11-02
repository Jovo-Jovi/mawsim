"use client";

import { defaultLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

const copy = messages(defaultLocale);

export default function ErrorPage({
  retry,
}: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  return (
    <main>
      <h1>{copy.error.title}</h1>
      <button type="button" onClick={() => retry()}>
        {copy.error.retry}
      </button>
    </main>
  );
}
