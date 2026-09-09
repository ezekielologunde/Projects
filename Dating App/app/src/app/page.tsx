"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/error-messages";

/**
 * Email OTP sign-in (spec section 9.1): a 6-digit code, no passwords
 * anywhere in the system. Google sign-in and Turnstile are not wired up
 * yet -- both need credentials from the Supabase dashboard that only the
 * project owner can create (spec section 14, Phase -1/0 follow-ups).
 */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (error) {
      setError(friendlyErrorMessage(error.message));
      return;
    }
    setStage("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError(friendlyErrorMessage(error.message));
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  async function resendCode() {
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    setBusy(false);
    if (error) {
      setError(friendlyErrorMessage(error.message));
      return;
    }
    setInfo("A new code is on its way.");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Focus</h1>
        <p className="mt-2 text-sm text-gray-500">One person at a time, on purpose.</p>
      </div>

      {stage === "email" ? (
        <form onSubmit={requestCode} className="flex w-full max-w-sm flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex w-full max-w-sm flex-col gap-3">
          <p className="text-sm text-gray-500">
            We sent a 6-digit code to {email}.
          </p>
          <label className="text-sm font-medium" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 tracking-widest"
            placeholder="123456"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Verifying..." : "Verify and continue"}
          </button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={resendCode} disabled={busy} className="text-gray-500 underline disabled:opacity-50">
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("email");
                setError(null);
                setInfo(null);
              }}
              className="text-gray-500 underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      {info && <p className="text-sm text-gray-500">{info}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
