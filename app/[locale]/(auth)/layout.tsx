import type { ReactNode } from "react";
import Link from "next/link";
import { Cat } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  const t = await getTranslations("common");

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Cat className="h-5 w-5 text-teal-700" />
            {t("appName")}
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
