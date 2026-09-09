import { z } from "zod";

/**
 * Pure validation logic for the upload pipeline (spec sections 4.3, 7.28,
 * 7.17, 0.14), extracted out of actions.ts specifically so it's testable:
 * a "use server" file can only export async server actions, so none of
 * this -- constants, zod schemas, a plain byte-sniffing function -- could
 * live there and still be importable by a test file. Behavior is
 * unchanged; this is a relocation, not a rewrite.
 */

export const MAX_DECODED_PIXELS = 40_000_000; // guards against a decompression-bomb image (spec section 9.4, 3.4 #16)
export const MAX_DIMENSION_PHOTO = 1600;
export const MAX_DIMENSION_SELFIE = 1200;
export const MAX_DIMENSION_VIDEO_POSTER = 800; // a thumbnail, not a hero photo
export const MAX_VIDEO_BYTES = 26_214_400; // matches the video-incoming bucket's own file_size_limit (spec section 0.14): generous for a real 30s web recording, tight enough that a much-longer clip can't fit regardless of what the client's own timer did or didn't enforce

export const ticketIdSchema = z.string().uuid();
export const promptTextSchema = z.string().trim().min(1).max(200);

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
export function sniffVideoFormat(buffer: Buffer): "webm" | "mp4" | null {
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "webm"; // WebM/Matroska EBML header
  }
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "mp4"; // MP4 container
  }
  return null;
}
