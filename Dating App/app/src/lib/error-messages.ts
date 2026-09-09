/**
 * Maps a raw error (a named code from one of our own functions, or GoTrue's
 * own message text) to calm, plain copy (spec section 1, 9.9: errors sent to
 * the client are codes, never stack traces or raw SQL/constraint text).
 * Anything unrecognized falls back to a generic message rather than being
 * shown verbatim -- the fallback is the actual safety net here, not the
 * individual mappings.
 */
const KNOWN: [pattern: RegExp, message: string][] = [
  [/not_authenticated/i, "Please sign in again."],
  [/underage/i, "You must be 18 or older to use Focus."],
  [/age_gate_required/i, "Please complete the age step first."],
  [/invalid_prompts/i, "Each answer needs to be between 1 and 200 characters."],
  [/too_many_photos/i, "You can have up to 6 photos."],
  [/too_many_heritage_values/i, "You can list up to 5 values per field."],
  [/invalid_height_range/i, "Minimum height must be less than or equal to maximum height."],
  [/too_many_verification_attempts/i, "Too many attempts today. Please try again tomorrow."],
  [/daily_upload_limit/i, "You've reached today's upload limit. Please try again tomorrow."],
  [/rate_limited/i, "You're making changes too quickly. Please wait a moment and try again."],
  [/missing_(basics|non_negotiables|photo|consent|verification_photo)/i, "Please complete every step before submitting."],
  [/already_submitted/i, "Your profile has already been submitted for review."],
  [/not_an_image/i, "That file doesn't look like a supported image."],
  [/image_too_large/i, "That image is too large or too detailed. Please try a different photo."],
  [/not_a_video/i, "That file doesn't look like a supported video."],
  [/video_too_large/i, "That video is too long or too large. Please record a shorter clip."],
  [/invalid_prompt_text/i, "Please choose a prompt before saving your video."],
  [/wrong_kind/i, "Something went wrong with that upload. Please try again."],
  [/(ticket_not_found|ticket_used|already_claimed|ticket_expired|not_claimed)/i, "That upload session expired. Please try again."],
  [/object_not_uploaded/i, "That upload didn't finish. Please try again."],
  [/(invalid_position|invalid_verification|missing_verification_id|unexpected_verification_id)/i, "Something went wrong with that upload. Please try again."],
  [/forbidden/i, "You don't have permission to do that."],
  [/already_decided/i, "This has already been reviewed."],
  [/invalid_decision/i, "Please choose Approve or Reject."],
  [/not_found/i, "That item couldn't be found."],
  [/could_not_start/i, "Couldn't start verification. Please try again."],
  [/(processing_failed|could_not_create_ticket|could_not_sign_upload|download_failed|upload_failed|invalid_ticket_id)/i, "Something went wrong with that upload. Please try again."],
  [/rate limit/i, "Too many attempts. Please wait a moment and try again."],
  [/(expired|invalid)/i, "That code is invalid or has expired. Please request a new one."],
];

export function friendlyErrorMessage(raw: string | null | undefined): string {
  if (raw) {
    for (const [pattern, message] of KNOWN) {
      if (pattern.test(raw)) return message;
    }
  }
  return "Something went wrong. Please try again.";
}
