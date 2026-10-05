import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { renderContactSheet } from "@/server/creative/export";
import { errorResponse } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    const id = z.uuid().safeParse((await context.params).id);
    if (!id.success) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const result = await renderContactSheet(db, tenant, id.data);
    if (!result) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    if (result.empty) return Response.json({ error: "Add frames before exporting." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    return new Response(new Uint8Array(result.png), { headers: {
      "Content-Type": "image/png", "Content-Length": String(result.png.length),
      "Content-Disposition": `attachment; filename="framehouse-story-${id.data}.png"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return errorResponse(error); }
}
