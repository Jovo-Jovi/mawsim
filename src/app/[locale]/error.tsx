"use client";

import { useParams } from "next/navigation";
import { defaultLocale, isLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

export default function ErrorPage({
  retry,
}: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  const params = useParams();
  const raw = params.locale;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const locale = candidate !== undefined && isLocale(candidate) ? candidate : defaultLocale;
  const copy = messages(locale);
  return (
    <main>
      <h1>{copy.error.title}</h1>
      <button type="button" onClick={() => retry()}>
        {copy.error.retry}
      </button>
    </main>
  );
}
