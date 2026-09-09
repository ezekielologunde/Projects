import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Placeholder. The real daily loop (discovery, waiting list, connections)
 * is Phase 2 (spec section 14), gated on the Phase -1 legal review. This
 * page only confirms an approved user lands somewhere sensible.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, first_name")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "active") redirect("/onboarding");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Welcome, {profile.first_name}.</h1>
      <p className="max-w-sm text-sm text-gray-500">
        You&apos;re verified and active. Discovery isn&apos;t built yet -- that&apos;s Phase 2.
      </p>
    </main>
  );
}
