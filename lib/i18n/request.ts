import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    // Redirect to the default locale if locale is invalid
  }

  return {
    locale: locale || defaultLocale,
    messages: (await import(`../../messages/${locale || defaultLocale}.json`)).default,
    timeZone: "UTC",
    now: new Date(),
  };
});
