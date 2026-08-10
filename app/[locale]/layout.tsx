import type { Metadata } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import { locales } from "@/lib/i18n/config";
import "@/app/globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Whisker Tracker",
  description: "Cat colony management for rescue teams and caretakers",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isSupportedLocale = locales.includes(locale as (typeof locales)[number]);

  // Validate that the locale is valid
  if (!isSupportedLocale) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
