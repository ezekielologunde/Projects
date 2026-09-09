import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * purge_verification_selfies (spec sections 7.25, 8.3, 0.18): deletes the
 * Storage object for any verification decided more than a day ago, then
 * nulls selfie_path -- only after the Storage delete actually succeeds,
 * the same "Storage first, then record it" order processUploadedImage's
 * own cleanup already follows.
 */
async function purgeVerificationSelfies(service: ServiceClient) {
  const { data: stale, error: listError } = await service.rpc("list_stale_verification_selfies");
  if (listError) {
    return { error: "list_failed" };
  }

  let cleared = 0;
  const failed: string[] = [];
  for (const row of stale ?? []) {
    const { error: removeError } = await service.storage.from("verification").remove([row.object_name]);
    if (removeError) {
      failed.push(row.verification_id);
      continue;
    }
    const { error: clearError } = await service.rpc("clear_verification_selfie_path", {
      p_verification_id: row.verification_id,
    });
    if (clearError) {
      failed.push(row.verification_id);
      continue;
    }
    cleared += 1;
  }

  return { cleared, failed };
}

/**
 * Daily purge route (spec section 7.25). Runs purge_verification_selfies
 * today; purge_deleted_accounts joins once Phase 4 builds
 * deletion_requests and private._purge_user() (section 14, Phase 4).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  return NextResponse.json({
    purgeVerificationSelfies: await purgeVerificationSelfies(service),
  });
}
