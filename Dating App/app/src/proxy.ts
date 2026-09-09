import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Focus security headers, per docs/specs/2026-09-08-focus-architecture-security-design.md
 * section 9.3. Every response gets a fresh nonce and a strict CSP that still allows
 * Cloudflare Turnstile to load (Turnstile requires the literal origin in script-src and
 * frame-src, not a nonce alone -- confirmed against Cloudflare's own CSP documentation
 * before this was written).
 *
 * strict-dynamic is added alongside the nonce following Next.js's own recommended pattern:
 * scripts loaded by a nonce'd script are trusted automatically in browsers that support
 * strict-dynamic, with the explicit Turnstile origin kept as a fallback for those that don't.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = SUPABASE_URL.replace(/\/$/, "");
const supabaseWsOrigin = supabaseOrigin.replace(/^https:/, "wss:");

function buildCsp(nonce: string, isDev: boolean): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: ${supabaseOrigin};
    font-src 'self';
    connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} https://challenges.cloudflare.com;
    frame-src https://challenges.cloudflare.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), geolocation=(self), microphone=(), payment=()",
  );

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
