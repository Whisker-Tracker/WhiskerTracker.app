import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";

export default async function DebugPage() {
  const locale = await getLocale();
  const t = await getTranslations("auth");
  
  return (
    <div className="p-8 space-y-4">
      <h1>Debug Page</h1>
      <p>Locale: {locale}</p>
      <p>Test translation - auth.signIn: {t("signIn")}</p>
      <p>Test translation - auth.password: {t("password")}</p>
      <p>Test translation - auth.accessYourDashboard: {t("accessYourDashboard")}</p>
    </div>
  );
}
