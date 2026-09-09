"use server";

import { z } from "zod";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_DECODED_PIXELS = 40_000_000; // guards against a decompression-bomb image (spec section 9.4, 3.4 #16)
const MAX_DIMENSION_PHOTO = 1600;
const MAX_DIMENSION_SELFIE = 1200;
const MAX_DIMENSION_VIDEO_POSTER = 800; // a thumbnail, not a hero photo
const MAX_VIDEO_BYTES = 26_214_400; // matches the video-incoming bucket's own file_size_limit (spec section 0.14): generous for a real 30s web recording, tight enough that a much-longer clip can't fit regardless of what the client's own timer did or didn't enforce

const ticketIdSchema = z.string().uuid();
const promptTextSchema = z.string().trim().min(1).max(200);

/**
 * Container-format sniff for the two formats MediaRecorder actually
 * produces (spec section 0.14): WebM's EBML header, or MP4's `ftyp` box --
 * Safari records MP4, everything else records WebM (the client tries
 * `video/webm` first and falls back to `video/mp4`, wizard.tsx). Not a
 * decode -- there is no server-side video decoder in this phase -- just
 * confirming the bytes are what they claim to be, the same role Sharp's
 * metadata() call plays for images just below. Returns which container
 * actually matched, not just whether one did: the destination object's
 * extension and Content-Type must follow the real bytes, not a guess,
 * or a genuine Safari recording gets served back mislabeled.
 */
function sniffVideoFormat(buffer: Buffer): "webm" | "mp4" | null {
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "webm"; // WebM/Matroska EBML header
  }
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "mp4"; // MP4 container
  }
  return null;
}

/**
 * The processing half of the upload pipeline (spec section 4.3, 7.28, 7.17).
 * Called after the browser has already PUT the raw bytes directly to the
 * `incoming` bucket using the signed URL from createUploadTicket. This is
 * the only place the secret key and Sharp are used; every database write
 * still goes through begin_upload/process_upload under the caller's own
 * JWT, not this client.
 */
export async function processUploadedImage(ticketId: string) {
  const parsedTicketId = ticketIdSchema.safeParse(ticketId);
  if (!parsedTicketId.success) {
    return { error: "invalid_ticket_id" };
  }
  ticketId = parsedTicketId.data;

  const supabase = await createClient();

  // Step 1: claim the ticket under the caller's own JWT. This is the only
  // way the route learns the object path, kind, position, and verification
  // id -- never a client-supplied path (spec section 7.28).
  const { data: claimed, error: claimError } = await supabase.rpc("begin_upload", {
    ticket_id: ticketId,
  });
  if (claimError || !claimed) {
    return { error: claimError?.message ?? "ticket_not_found" };
  }

  const ticket = claimed as {
    kind: "photo" | "selfie";
    objectPath: string;
    destPath: string;
    position: number | null;
    verificationId: string | null;
  };

  const service = createServiceClient();

  // Step 2: download the original from `incoming` with the secret key.
  const { data: original, error: downloadError } = await service.storage
    .from("incoming")
    .download(ticket.objectPath.replace(/^incoming\//, ""));
  if (downloadError || !original) {
    return { error: "download_failed" };
  }
  const originalBuffer = Buffer.from(await original.arrayBuffer());

  // Step 3: sniff real file type from bytes, not the declared MIME or
  // extension (spec section 4.3, 9.4).
  const image = sharp(originalBuffer, { failOn: "error" });
  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    return { error: "not_an_image" };
  }
  if (!metadata.format || !["jpeg", "png", "webp", "heif"].includes(metadata.format)) {
    return { error: "not_an_image" };
  }
  const decodedPixels = (metadata.width ?? 0) * (metadata.height ?? 0);
  if (decodedPixels === 0 || decodedPixels > MAX_DECODED_PIXELS) {
    return { error: "image_too_large" };
  }

  // Step 4: strip metadata (including GPS), resize, re-encode as WebP
  // (spec section 8.3).
  const maxDimension = ticket.kind === "selfie" ? MAX_DIMENSION_SELFIE : MAX_DIMENSION_PHOTO;
  const processed = await sharp(originalBuffer)
    .rotate() // apply EXIF orientation before stripping EXIF, then strip it
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });

  // Step 5: write the processed image to its destination bucket.
  const destBucket = ticket.kind === "photo" ? "photos" : "verification";
  const destObjectPath = ticket.destPath.replace(new RegExp(`^${destBucket}/`), "");
  const { error: uploadError } = await service.storage
    .from(destBucket)
    .upload(destObjectPath, processed.data, {
      contentType: "image/webp",
      upsert: true,
    });
  if (uploadError) {
    return { error: "upload_failed" };
  }

  // Step 6: record the result under the caller's own JWT, which also
  // marks the ticket used (spec section 7.17).
  const { data: result, error: processError } = await supabase.rpc("process_upload", {
    ticket_id: ticketId,
    width: processed.info.width,
    height: processed.info.height,
  });

  // Step 7: delete the incoming original, and any orphaned previous photo
  // at the same position, with the secret key. Best-effort in the sense the
  // comment always meant: wrapped so a Storage error here can never turn an
  // otherwise-successful upload into a thrown exception. A failure here is
  // cleaned up later by the purge_incoming cron job (spec section 7.25).
  try {
    await service.storage.from("incoming").remove([ticket.objectPath.replace(/^incoming\//, "")]);
    const oldPath = (result as { oldStoragePath?: string } | null)?.oldStoragePath;
    if (oldPath) {
      await service.storage.from("photos").remove([oldPath.replace(/^photos\//, "")]);
    }
  } catch {
    // best-effort: swallow, the cron purge covers this later.
  }

  if (processError) {
    return { error: processError.message };
  }

  return { data: result };
}

/**
 * The video prompt's own processing route (spec section 0.14). Same
 * three-step shape as processUploadedImage above -- claim under the
 * caller's JWT, validate and write with the secret key, record under the
 * caller's JWT again -- except there is no Sharp-equivalent decode for
 * the video itself: it is written through unchanged once its container
 * format and size are confirmed. Only the poster frame, an ordinary
 * image, gets the full Sharp treatment.
 */
export async function processUploadedVideoPrompt(ticketId: string, durationMs: number, promptText: string) {
  const parsedTicketId = ticketIdSchema.safeParse(ticketId);
  const parsedPromptText = promptTextSchema.safeParse(promptText);
  if (!parsedTicketId.success) {
    return { error: "invalid_ticket_id" };
  }
  if (!parsedPromptText.success) {
    return { error: "invalid_prompt_text" };
  }
  ticketId = parsedTicketId.data;
  promptText = parsedPromptText.data;
  const clampedDurationMs = Math.max(0, Math.min(30_000, Math.round(durationMs) || 0));

  const supabase = await createClient();

  const { data: claimed, error: claimError } = await supabase.rpc("begin_upload", {
    ticket_id: ticketId,
  });
  if (claimError || !claimed) {
    return { error: claimError?.message ?? "ticket_not_found" };
  }

  const ticket = claimed as {
    kind: "photo" | "selfie" | "video_prompt";
    objectPath: string;
    posterObjectPath: string | null;
    destPath: string;
    posterDestPath: string | null;
  };
  if (ticket.kind !== "video_prompt" || !ticket.posterObjectPath || !ticket.posterDestPath) {
    return { error: "wrong_kind" };
  }

  const service = createServiceClient();

  const { data: rawVideo, error: videoDownloadError } = await service.storage
    .from("video-incoming")
    .download(ticket.objectPath.replace(/^video-incoming\//, ""));
  if (videoDownloadError || !rawVideo) {
    return { error: "download_failed" };
  }
  const videoBuffer = Buffer.from(await rawVideo.arrayBuffer());

  if (videoBuffer.byteLength === 0 || videoBuffer.byteLength > MAX_VIDEO_BYTES) {
    return { error: "video_too_large" };
  }
  const videoFormat = sniffVideoFormat(videoBuffer);
  if (!videoFormat) {
    return { error: "not_a_video" };
  }

  const { data: rawPoster, error: posterDownloadError } = await service.storage
    .from("incoming")
    .download(ticket.posterObjectPath.replace(/^incoming\//, ""));
  if (posterDownloadError || !rawPoster) {
    return { error: "download_failed" };
  }
  const posterBuffer = Buffer.from(await rawPoster.arrayBuffer());

  const posterImage = sharp(posterBuffer, { failOn: "error" });
  let posterMetadata;
  try {
    posterMetadata = await posterImage.metadata();
  } catch {
    return { error: "not_an_image" };
  }
  if (!posterMetadata.format || !["jpeg", "png", "webp", "heif"].includes(posterMetadata.format)) {
    return { error: "not_an_image" };
  }
  const posterDecodedPixels = (posterMetadata.width ?? 0) * (posterMetadata.height ?? 0);
  if (posterDecodedPixels === 0 || posterDecodedPixels > MAX_DECODED_PIXELS) {
    return { error: "image_too_large" };
  }

  const processedPoster = await sharp(posterBuffer)
    .rotate()
    .resize({ width: MAX_DIMENSION_VIDEO_POSTER, height: MAX_DIMENSION_VIDEO_POSTER, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });

  // begin_upload's own destPath is a fixed .webm guess (7.30 doesn't know
  // the real container until these bytes are actually sniffed, above);
  // recomputed here from the sniffed format instead of trusted, the same
  // way process_upload recomputes its own dest_path rather than trusting
  // the ticket's. process_video_prompt_upload independently recomputes it
  // again server-side from video_format, so a client can propose a format
  // but not a path.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "not_authenticated" };
  }
  const videoDestObjectPath = `${user.id}/${ticketId}.${videoFormat}`;
  const posterDestObjectPath = ticket.posterDestPath.replace(/^video-prompts\//, "");

  const { error: videoUploadError } = await service.storage
    .from("video-prompts")
    .upload(videoDestObjectPath, videoBuffer, { contentType: `video/${videoFormat}`, upsert: true });
  if (videoUploadError) {
    return { error: "upload_failed" };
  }
  const { error: posterUploadError } = await service.storage
    .from("video-prompts")
    .upload(posterDestObjectPath, processedPoster.data, { contentType: "image/webp", upsert: true });
  if (posterUploadError) {
    return { error: "upload_failed" };
  }

  const { data: result, error: processError } = await supabase.rpc("process_video_prompt_upload", {
    ticket_id: ticketId,
    video_format: videoFormat,
    poster_width: processedPoster.info.width,
    poster_height: processedPoster.info.height,
    duration_ms: clampedDurationMs,
    prompt_text: promptText,
  });

  // Best-effort cleanup, same reasoning as processUploadedImage: never let
  // a Storage error here turn an otherwise-successful upload into a
  // thrown exception. The purge_incoming cron job (spec section 7.25)
  // covers any leftovers.
  try {
    await service.storage.from("video-incoming").remove([ticket.objectPath.replace(/^video-incoming\//, "")]);
    await service.storage.from("incoming").remove([ticket.posterObjectPath.replace(/^incoming\//, "")]);
    const oldVideoPath = (result as { oldVideoPath?: string } | null)?.oldVideoPath;
    const oldPosterPath = (result as { oldPosterPath?: string } | null)?.oldPosterPath;
    const toRemove = [oldVideoPath, oldPosterPath]
      .filter((p): p is string => Boolean(p))
      .map((p) => p.replace(/^video-prompts\//, ""));
    if (toRemove.length > 0) {
      await service.storage.from("video-prompts").remove(toRemove);
    }
  } catch {
    // best-effort: swallow, the cron purge covers this later.
  }

  if (processError) {
    return { error: processError.message };
  }

  return { data: result };
}
