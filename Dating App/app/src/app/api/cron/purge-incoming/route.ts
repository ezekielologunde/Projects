import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * purge_incoming (spec sections 7.25, 8.5, 0.18): hourly hard ceiling on
 * the incoming/video-incoming buckets. storage.objects carries a trigger
 * that refuses a raw SQL delete, so real byte deletion only ever happens
 * here, through the Storage API with the secret key -- the database side
 * (public.list_stale_incoming_objects, service_role only) just lists.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: stale, error: listError } = await service.rpc("list_stale_incoming_objects");
  if (listError) {
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const pathsByBucket = new Map<string, string[]>();
  for (const row of stale ?? []) {
    const paths = pathsByBucket.get(row.bucket_id) ?? [];
    paths.push(row.object_name);
    pathsByBucket.set(row.bucket_id, paths);
  }

  let removed = 0;
  const failedBuckets: string[] = [];
  for (const [bucket, paths] of pathsByBucket) {
    const { data, error } = await service.storage.from(bucket).remove(paths);
    if (error) {
      failedBuckets.push(bucket);
      continue;
    }
    removed += data?.length ?? 0;
  }

  return NextResponse.json({ removed, failedBuckets });
}
