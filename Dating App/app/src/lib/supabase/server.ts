import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client, carrying the signed-in user's own session cookie.
 * Every read and write through this client is still governed by RLS -- see spec
 * section 4.2, trust boundary 3. This is never given the secret key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no request context to mutate;
            // safe to ignore as long as proxy.ts keeps sessions refreshed.
          }
        },
      },
    },
  );
}
