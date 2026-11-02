import { defaultLocale } from "@/i18n/config";
import { messages } from "@/i18n/messages";

export default function HomePage() {
  const copy = messages(defaultLocale);
  return (
    <main>
      <h1>{copy.app.name}</h1>
      <p>{copy.app.tagline}</p>
    </main>
  );
}
