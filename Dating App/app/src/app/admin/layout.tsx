import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminMfaGate from "./mfa-gate";

/**
 * Admin route group (spec section 9.6). This layout is a UX convenience,
 * not the security boundary: every admin RLS policy and function checks
 * is_admin_mfa independently, so even if this check were somehow bypassed,
 * nothing admin-shaped would actually be reachable. Uses
 * am_i_admin_identity (not-an-admin vs needs-TOTP) and am_i_admin
 * (aal2-complete) together, since neither alone can tell those two cases
 * apart -- spec section 6.1.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: isAdmin } = await supabase.rpc("am_i_admin_identity");
  if (!isAdmin) redirect("/home");

  const { data: hasAal2 } = await supabase.rpc("am_i_admin");
  if (!hasAal2) {
    return <AdminMfaGate />;
  }

  return <div className="mx-auto max-w-3xl px-6 py-10">{children}</div>;
}
