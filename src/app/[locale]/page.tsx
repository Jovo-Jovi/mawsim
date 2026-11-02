import { localeParam } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";

export default async function HomePage() {
  const locale = await localeParam();
  const copy = messages(locale);
  return (
    <main>
      <h1>{copy.app.tagline}</h1>
    </main>
  );
}
