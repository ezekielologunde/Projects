"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin TOTP enrollment and step-up (spec section 9.1): admin accounts
 * require both a linked provider and an enrolled second factor. Google
 * sign-in alone is never treated as sufficient here, matching the spec's
 * explicit rejection of "Google login implies 2FA."
 */
export default function AdminMfaGate() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"loading" | "enroll" | "challenge">("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
        return;
      }
      const existing = data.totp.find((f) => f.status === "verified");
      if (existing) {
        setFactorId(existing.id);
        setMode("challenge");
      } else {
        setMode("enroll");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      setError(error?.message ?? "enroll_failed");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function verify() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setBusy(false);
      setError(challengeError?.message ?? "challenge_failed");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">Set up two-factor authentication to continue</h1>
      <p className="text-sm text-gray-500">
        Admin accounts require a second factor. A Google or email sign-in alone is never enough.
      </p>

      {mode === "enroll" && !qrCode && (
        <button onClick={startEnroll} disabled={busy} className="rounded bg-black px-3 py-2 text-white">
          {busy ? "Starting..." : "Set up authenticator app"}
        </button>
      )}

      {mode === "enroll" && qrCode && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="Scan with your authenticator app" className="h-40 w-40" />
          {secret && <p className="break-all text-xs text-gray-400">Or enter manually: {secret}</p>}
        </>
      )}

      {(mode === "challenge" || (mode === "enroll" && qrCode)) && (
        <div className="flex w-full flex-col gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="123456"
            className="rounded border border-gray-300 px-3 py-2 text-center tracking-widest"
          />
          <button onClick={verify} disabled={busy} className="rounded bg-black px-3 py-2 text-white">
            {busy ? "Verifying..." : "Verify"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
