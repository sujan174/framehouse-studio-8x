import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { listReferences, MAX_UPLOAD_BYTES, saveReference } from "@/server/generations/references";
import { errorResponse, readLimitedBytes, verifyMutationRequest } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store" };
const missing = () => Response.json({ error: "Project not found" }, { status: 404, headers });
export async function GET(_request: Request, context: Context) {
  try { const tenant = await currentTenant(); const id = z.uuid().safeParse((await context.params).id); if (!id.success) return missing();
    const references = await listReferences(db, tenant, id.data);
    return references ? Response.json({ references }, { headers }) : missing();
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try { const tenant = await currentTenant(); verifyMutationRequest(request, tenant.orgId);
    const id = z.uuid().safeParse((await context.params).id); if (!id.success) return missing();
    if (!request.headers.get("content-type")?.startsWith("image/")) throw new SyntaxError();
    const reference = await saveReference(db, tenant, id.data, await readLimitedBytes(request, MAX_UPLOAD_BYTES));
    return reference ? Response.json({ reference }, { status: 201, headers }) : missing();
  } catch (error) { return errorResponse(error); }
}
