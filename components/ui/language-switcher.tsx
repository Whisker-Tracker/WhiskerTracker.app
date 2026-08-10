"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Extract locale from pathname (e.g., "/en/dashboard" -> "en")
  const segments = pathname.split("/");
  const locale = segments[1] && ["en", "es"].includes(segments[1]) ? segments[1] : "en";

  const changeLanguage = (newLocale: string) => {
    startTransition(() => {
      // Remove the current locale from the pathname if it exists
      let newPathname = pathname;
      if (["en", "es"].includes(segments[1])) {
        // Replace the locale in the pathname
        segments[1] = newLocale;
        newPathname = segments.join("/") || "/";
      } else {
        // Add the locale if it doesn't exist
        newPathname = `/${newLocale}${pathname}`;
      }

      router.push(newPathname);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-slate-600" />
      <select
        value={locale}
        onChange={(e) => changeLanguage(e.target.value)}
        disabled={isPending}
        className="px-2 py-1 text-sm rounded border border-slate-300 bg-white text-slate-900 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
}
