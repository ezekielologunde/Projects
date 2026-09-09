import { timingSafeEqual } from "crypto";

/**
 * Bearer-secret check shared by /api/cron/* routes (spec sections 7.25,
 * 9.7). Vercel injects `Authorization: Bearer $CRON_SECRET` automatically
 * for its own Cron Job requests once CRON_SECRET is configured; this
 * rejects everything else, including a request with no header at all.
 * Constant-time comparison so response timing can't be used to guess the
 * secret one byte at a time.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const headerBuffer = Buffer.from(header);
  const expectedBuffer = Buffer.from(expected);
  if (headerBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(headerBuffer, expectedBuffer);
}
