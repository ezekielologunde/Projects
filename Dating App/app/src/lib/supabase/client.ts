import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser Supabase client. Uses the publishable key only (Supabase's new key model,
 * ahead of the legacy anon/service_role deprecation -- see spec section 9.7). RLS is
 * the real protection; this key is safe to ship to the client by design.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
