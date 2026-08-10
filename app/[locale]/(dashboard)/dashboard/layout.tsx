import type { ReactNode } from "react";
import Link from "next/link";
import { Cat, ClipboardList, HeartPulse, Home, MapPinned, PawPrint, Pill, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import messages_en from "@/messages/en.json";
import messages_es from "@/messages/es.json";

const messagesMap: Record<string, Record<string, unknown>> = {
  en: messages_en as unknown as Record<string, unknown>,
  es: messages_es as unknown as Record<string, unknown>,
};

export default async function DashboardLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  const messages = messagesMap[locale] ?? messagesMap.en;
  const commonMessages = messages.common as Record<string, string>;
  const dashboardMessages = messages.dashboard as Record<string, string>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(locale === "en" ? "/login" : `/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    redirect(locale === "en" ? "/login" : `/${locale}/login`);
  }

  const isAdmin = profile?.role === "admin" && profile?.is_active;

  const navItems = [
    { href: "/dashboard", label: dashboardMessages.overview, icon: Home },
    { href: "/dashboard/colonies", label: dashboardMessages.colonies, icon: MapPinned },
    { href: "/dashboard/cats", label: dashboardMessages.cats, icon: Cat },
    { href: "/dashboard/diseases", label: dashboardMessages.diseases, icon: HeartPulse },
    { href: "/dashboard/treatments", label: dashboardMessages.treatments, icon: Pill },
    { href: "/dashboard/logs", label: dashboardMessages.logs, icon: ClipboardList },
  ];

  if (isAdmin) {
    navItems.push({ href: "/dashboard/users", label: dashboardMessages.users, icon: Users });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid w-full gap-4 px-4 py-4 md:grid-cols-[240px_1fr] md:px-6">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-4 md:h-[calc(100vh-2rem)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <PawPrint className="h-5 w-5 text-teal-700" />
              <span className="text-base font-semibold">{commonMessages.appName}</span>
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form action={logoutAction} className="mt-6">
            <Button type="submit" variant="ghost" className="w-full">
              {commonMessages.signOut}
            </Button>
          </form>
        </aside>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
