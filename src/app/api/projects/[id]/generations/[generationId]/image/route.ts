import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { getGenerationImage } from "@/server/generations/repository";
import { errorResponse } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; generationId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    const params = await context.params;
    const projectId = z.uuid().safeParse(params.id);
    const generationId = z.uuid().safeParse(params.generationId);
    if (!projectId.success || !generationId.success)
      return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const image = await getGenerationImage(db, tenant, projectId.data, generationId.data);
    if (!image) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(new Uint8Array(image), { headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(image.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="framehouse-${generationId.data}.jpg"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return errorResponse(error);
  }
}
