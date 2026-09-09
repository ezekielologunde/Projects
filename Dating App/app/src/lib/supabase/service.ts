import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Secret-key client. Server-only, never imported by client code. Used only
 * for Storage byte operations in the upload pipeline (spec sections 4.2,
 * 9.7): downloading from `incoming`, writing to `photos`/`verification`,
 * deleting the processed original. Never used to bypass RLS on a table --
 * every database write in the upload flow still goes through a
 * SECURITY DEFINER RPC called with the user's own JWT (begin_upload,
 * process_upload), not this client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured");
  }
  return createSupabaseClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
