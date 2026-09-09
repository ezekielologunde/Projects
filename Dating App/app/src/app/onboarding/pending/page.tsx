import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PendingReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "active") redirect("/home");
  if (profile?.status === "onboarding") redirect("/onboarding");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">You&apos;re in the queue</h1>
      <p className="max-w-sm text-sm text-gray-500">
        A human reviews every selfie before your profile becomes visible to anyone. This usually
        does not take long. Check back soon.
      </p>
    </main>
  );
}
