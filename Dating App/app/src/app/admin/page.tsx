import { createClient } from "@/lib/supabase/server";
import ReviewQueueClient from "./review-queue-client";

/**
 * Admin verification queue (spec section 14, Phase 1 exit criterion).
 * Only reachable past the aal2 gate in layout.tsx. Renders the same
 * viewable profile card a user sees, plus status and the pending
 * verification's pose code, matching spec section 9.6 ("no more than
 * the ordinary card, plus status and history").
 */
export default async function AdminReviewQueuePage() {
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("verifications")
    .select("id, profile_id, pose_code, submitted_at, selfie_path, profiles(first_name, city_label)")
    .is("decision", null)
    .not("selfie_path", "is", null)
    .order("submitted_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Verification queue</h1>
      <p className="text-sm text-gray-500">{pending?.length ?? 0} pending</p>
      <ReviewQueueClient items={pending ?? []} />
    </div>
  );
}
