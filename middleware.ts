import { NextResponse, type NextRequest } from "next/server";
import intlMiddleware from "@/lib/i18n/middleware";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Apply i18n middleware
  const intlResponse = intlMiddleware(request);
  
  // Apply Supabase session update
  const supabaseResponse = await updateSession(request);
  
  // Merge responses - combine headers from both
  const response = new NextResponse(
    intlResponse.body || supabaseResponse.body,
    intlResponse.status ? { status: intlResponse.status } : supabaseResponse
  );
  
  // Copy headers from both responses
  intlResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  supabaseResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  // Check for dashboard route protection
  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.includes("/dashboard");
  
  if (isDashboardRoute) {
    const hasSupabaseSessionCookie = request
      .cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));

    if (!hasSupabaseSessionCookie) {
      const url = request.nextUrl.clone();
      // Preserve the locale in the redirect
      const locale = pathname.split("/")[1];
      const isValidLocale = ["en", "es"].includes(locale);
      url.pathname = isValidLocale ? `/${locale}/login` : "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
