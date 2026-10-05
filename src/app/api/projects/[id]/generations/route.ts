import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { countDailyGenerationUsage, createGeneration, listGenerations } from "@/server/generations/repository";
import { generationView } from "@/server/generations/view";
import { errorResponse, readSmallJson, verifyMutationRequest } from "@/server/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const missing = () => Response.json({ error: "Project not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });

export async function GET(_request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    const projectId = z.uuid().safeParse((await context.params).id);
    if (!projectId.success) return missing();
    const generations = await listGenerations(db, tenant, projectId.data);
    return generations ? Response.json({ generations: generations.map(generationView), dailyUsed: await countDailyGenerationUsage(db, tenant) }, { headers: { "Cache-Control": "private, no-store" } }) : missing();
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    verifyMutationRequest(request, tenant.orgId);
    const projectId = z.uuid().safeParse((await context.params).id);
    if (!projectId.success) return missing();
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN)
      return Response.json({ error: "Image generation is not configured yet." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    const generation = await createGeneration(db, tenant, projectId.data, await readSmallJson(request));
    return generation ? Response.json({ generation: generationView(generation), dailyUsed: await countDailyGenerationUsage(db, tenant) }, { status: 202, headers: { "Cache-Control": "private, no-store" } }) : missing();
  } catch (error) {
    return errorResponse(error);
  }
}
