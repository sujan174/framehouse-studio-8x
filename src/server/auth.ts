import "server-only";
import { auth } from "@clerk/nextjs/server";
import { requireTenant } from "./tenant";
export async function currentTenant() {
  const session = await auth();
  return requireTenant({
    userId: session.userId ?? null,
    orgId: session.orgId ?? null,
    orgRole: session.orgRole ?? null,
  });
}
