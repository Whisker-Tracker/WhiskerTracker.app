import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export function createClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
