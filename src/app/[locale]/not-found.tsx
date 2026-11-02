import { localeHref } from "@/i18n/href";
import { localeParamOrDefault } from "@/i18n/locale-param";
import { messages } from "@/i18n/messages";

export default async function NotFoundPage() {
  const locale = await localeParamOrDefault();
  const copy = messages(locale);
  return (
    <main>
      <h1>{copy.notFound.title}</h1>
      <p>{copy.notFound.body}</p>
      <a href={localeHref(locale, "")}>{copy.notFound.home}</a>
    </main>
  );
}
