import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { processUploadedImage } from "./actions";

/**
 * Shared client-side upload flow for both photo and selfie uploads (spec
 * section 4.3): create a ticket, PUT the raw bytes directly to Storage
 * using the signed URL (never through a Vercel function body, which is
 * why Vercel's 4.5 MB limit never applies here), then hand off to the
 * server action for the secret-key/Sharp half.
 */
export async function uploadImage(
  supabase: SupabaseClient<Database>,
  file: File,
  kind: "photo" | "selfie",
  opts: { position?: number; verificationId?: string },
): Promise<{ error?: string }> {
  const { data: ticket, error: ticketError } = await supabase.rpc("create_upload_ticket", {
    kind,
    p_position: opts.position,
    verification_id: opts.verificationId,
  });
  if (ticketError || !ticket) {
    return { error: ticketError?.message ?? "could_not_create_ticket" };
  }

  const { ticketId, objectPath } = ticket as { ticketId: string; objectPath: string };

  const { data: signed, error: signedError } = await supabase.storage
    .from("incoming")
    .createSignedUploadUrl(objectPath.replace(/^incoming\//, ""));
  if (signedError || !signed) {
    return { error: signedError?.message ?? "could_not_sign_upload" };
  }

  const { error: uploadError } = await supabase.storage
    .from("incoming")
    .uploadToSignedUrl(signed.path, signed.token, file);
  if (uploadError) {
    return { error: uploadError.message };
  }

  const result = await processUploadedImage(ticketId);
  if (result.error) {
    return { error: result.error };
  }
  return {};
}
