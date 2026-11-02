import { NotFoundCopy } from "@/components/NotFoundCopy";
import { PageShell } from "@/components/PageShell";
import { localeParamOrDefault } from "@/i18n/locale-param";

export default async function NotFoundPage() {
  const locale = await localeParamOrDefault();
  return (
    <PageShell locale={locale} path="">
      <NotFoundCopy locale={locale} />
    </PageShell>
  );
}
