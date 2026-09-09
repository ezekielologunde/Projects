"use server";

import { z } from "zod";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_DECODED_PIXELS = 40_000_000; // guards against a decompression-bomb image (spec section 9.4, 3.4 #16)
const MAX_DIMENSION_PHOTO = 1600;
const MAX_DIMENSION_SELFIE = 1200;

const ticketIdSchema = z.string().uuid();

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
  // cleaned up later by the purge_incoming cron job (spec section 7.19).
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
