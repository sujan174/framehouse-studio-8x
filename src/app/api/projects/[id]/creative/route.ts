import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { getCreativeState, saveCreativeState } from "@/server/creative/repository";
import { errorResponse, readSmallJson, verifyMutationRequest } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const missing = () => Response.json({ error: "Project not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
export async function GET(_request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    const id = z.uuid().safeParse((await context.params).id);
    if (!id.success) return missing();
    const state = await getCreativeState(db, tenant, id.data);
    return state ? Response.json({ state }, { headers: { "Cache-Control": "private, no-store" } }) : missing();
  } catch (error) { return errorResponse(error); }
}
export async function PUT(request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    verifyMutationRequest(request, tenant.orgId);
    const id = z.uuid().safeParse((await context.params).id);
    if (!id.success) return missing();
    const state = await saveCreativeState(db, tenant, id.data, await readSmallJson(request));
    return state ? Response.json({ state }, { headers: { "Cache-Control": "private, no-store" } }) : missing();
  } catch (error) { return errorResponse(error); }
}
