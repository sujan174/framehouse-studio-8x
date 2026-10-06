import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { getReferenceImage } from "@/server/generations/references";
import { errorResponse } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; referenceId: string }> };
export async function GET(_request: Request, context: Context) {
  try { const tenant = await currentTenant(); const params = await context.params;
    const projectId = z.uuid().safeParse(params.id), referenceId = z.uuid().safeParse(params.referenceId);
    const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    if (!projectId.success || !referenceId.success) return new Response(null, { status: 404, headers });
    const bytes = await getReferenceImage(db, tenant, projectId.data, referenceId.data);
    return bytes ? new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Length": String(bytes.length) } })
      : new Response(null, { status: 404, headers });
  } catch (error) { return errorResponse(error); }
}
