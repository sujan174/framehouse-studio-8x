import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { getPublication, publishStory, revokeStory } from "@/server/creative/publication";
import { errorResponse, verifyMutationRequest } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store" };
const missing = () => Response.json({ error: "Project not found" }, { status: 404, headers });
async function projectId(context: Context) { return z.uuid().safeParse((await context.params).id); }
export async function GET(_request: Request, context: Context) {
  try { const tenant = await currentTenant(); const id = await projectId(context); if (!id.success) return missing();
    const publication = await getPublication(db, tenant, id.data);
    return publication ? Response.json({ publication }, { headers }) : missing();
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try { const tenant = await currentTenant(); verifyMutationRequest(request, tenant.orgId);
    const id = await projectId(context); if (!id.success) return missing();
    const publication = await publishStory(db, tenant, id.data);
    return publication ? Response.json({ publication }, { headers }) : missing();
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { const tenant = await currentTenant(); verifyMutationRequest(request, tenant.orgId);
    const id = await projectId(context); if (!id.success) return missing();
    const publication = await revokeStory(db, tenant, id.data);
    return publication ? Response.json({ publication }, { headers }) : missing();
  } catch (error) { return errorResponse(error); }
}
