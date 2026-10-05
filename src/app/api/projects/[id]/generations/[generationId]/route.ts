import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { getGeneration } from "@/server/generations/repository";
import { generationView } from "@/server/generations/view";
import { errorResponse } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; generationId: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    const params = await context.params;
    const projectId = z.uuid().safeParse(params.id);
    const generationId = z.uuid().safeParse(params.generationId);
    if (!projectId.success || !generationId.success)
      return Response.json({ error: "Image not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const generation = await getGeneration(db, tenant, projectId.data, generationId.data);
    return generation ? Response.json({ generation: generationView(generation) }, { headers: { "Cache-Control": "private, no-store" } })
      : Response.json({ error: "Image not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
