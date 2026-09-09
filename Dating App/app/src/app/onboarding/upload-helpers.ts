import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { processUploadedImage, processUploadedVideoPrompt } from "./actions";

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

  try {
    const result = await processUploadedImage(ticketId);
    if (result.error) {
      return { error: result.error };
    }
    return {};
  } catch {
    return { error: "processing_failed" };
  }
}

/**
 * Video prompt upload (spec section 0.14): two raw files, one ticket. The
 * video goes to video-incoming and the poster frame -- an ordinary image,
 * captured client-side from the just-recorded clip -- goes to incoming
 * alongside a photo/selfie upload's own raw original.
 */
export async function uploadVideoPrompt(
  supabase: SupabaseClient<Database>,
  video: Blob,
  poster: Blob,
  opts: { durationMs: number; promptText: string },
): Promise<{ error?: string }> {
  const { data: ticket, error: ticketError } = await supabase.rpc("create_upload_ticket", {
    kind: "video_prompt",
  });
  if (ticketError || !ticket) {
    return { error: ticketError?.message ?? "could_not_create_ticket" };
  }

  const { ticketId, objectPath, posterObjectPath } = ticket as {
    ticketId: string;
    objectPath: string;
    posterObjectPath: string;
  };

  const { data: signedVideo, error: signedVideoError } = await supabase.storage
    .from("video-incoming")
    .createSignedUploadUrl(objectPath.replace(/^video-incoming\//, ""));
  if (signedVideoError || !signedVideo) {
    return { error: signedVideoError?.message ?? "could_not_sign_upload" };
  }
  const { error: videoUploadError } = await supabase.storage
    .from("video-incoming")
    .uploadToSignedUrl(signedVideo.path, signedVideo.token, video);
  if (videoUploadError) {
    return { error: videoUploadError.message };
  }

  const { data: signedPoster, error: signedPosterError } = await supabase.storage
    .from("incoming")
    .createSignedUploadUrl(posterObjectPath.replace(/^incoming\//, ""));
  if (signedPosterError || !signedPoster) {
    return { error: signedPosterError?.message ?? "could_not_sign_upload" };
  }
  const { error: posterUploadError } = await supabase.storage
    .from("incoming")
    .uploadToSignedUrl(signedPoster.path, signedPoster.token, poster);
  if (posterUploadError) {
    return { error: posterUploadError.message };
  }

  try {
    const result = await processUploadedVideoPrompt(ticketId, opts.durationMs, opts.promptText);
    if (result.error) {
      return { error: result.error };
    }
    return {};
  } catch {
    return { error: "processing_failed" };
  }
}
