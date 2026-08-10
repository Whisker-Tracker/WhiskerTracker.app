import type { ReactNode } from "react";
import Link from "next/link";
import { Cat } from "lucide-react";
import messages_es from "@/messages/es.json";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  const common = messages_es.common as Record<string, string>;

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Cat className="h-5 w-5 text-teal-700" />
          {common.appName}
        </Link>
        {children}
      </div>
    </div>
  );
}
