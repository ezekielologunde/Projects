"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  profile_id: string;
  pose_code: string;
  submitted_at: string;
  selfie_path: string | null;
  profiles: { first_name: string | null; city_label: string | null } | null;
};

export default function ReviewQueueClient({ items }: { items: Item[] }) {
  const supabase = createClient();
  const [decided, setDecided] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      await Promise.all(
        items.map(async (item) => {
          if (!item.selfie_path) return;
          const { data } = await supabase.storage
            .from("verification")
            .createSignedUrl(item.selfie_path.replace(/^verification\//, ""), 300);
          if (data) setUrls((u) => ({ ...u, [item.id]: data.signedUrl }));
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function decide(id: string, decision: "approved" | "rejected") {
    if (pending.has(id) || decided.has(id)) return;
    setError(null);
    setPending((p) => new Set(p).add(id));
    const { error } = await supabase.rpc("admin_review_verification", {
      p_verification_id: id,
      p_decision: decision,
    });
    setPending((p) => {
      const next = new Set(p);
      next.delete(id);
      return next;
    });
    if (error) {
      setError(error.message.includes("already_decided") ? "Already reviewed." : error.message);
      // Someone else's click (or a retry) already decided this one -- treat
      // it as done rather than leaving it stuck in the queue.
      if (error.message.includes("already_decided")) {
        setDecided((d) => new Set(d).add(id));
      }
      return;
    }
    setDecided((d) => new Set(d).add(id));
  }

  const remaining = items.filter((i) => !decided.has(i.id));

  if (remaining.length === 0) {
    return <p className="text-sm text-gray-500">Nothing waiting.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {remaining.map((item) => (
        <div key={item.id} className="flex flex-col gap-2 rounded border border-gray-200 p-4">
          <p className="font-medium">
            {item.profiles?.first_name ?? "Unnamed"} &middot; {item.profiles?.city_label ?? ""}
          </p>
          <p className="text-sm text-gray-500">
            Pose requested: <strong>{item.pose_code.replace("_", " ")}</strong>
          </p>
          {urls[item.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[item.id]} alt="Verification selfie" className="h-56 w-56 rounded object-cover" />
          ) : (
            <p className="text-sm text-gray-400">Loading photo...</p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => decide(item.id, "approved")}
              disabled={pending.has(item.id)}
              className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => decide(item.id, "rejected")}
              disabled={pending.has(item.id)}
              className="rounded border border-gray-300 px-3 py-2 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
