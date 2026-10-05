import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  archiveProject,
  getProject,
  updateProject,
} from "@/server/projects/repository";
import {
  errorResponse,
  readSmallJson,
  verifyMutationRequest,
} from "@/server/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
async function projectId(context: Context) {
  return z.uuid().parse((await context.params).id);
}
export async function GET(_request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    const project = await getProject(db, tenant, await projectId(context));
    return project
      ? Response.json(
          { project },
          { headers: { "Cache-Control": "private, no-store" } },
        )
      : Response.json({ error: "Project not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    verifyMutationRequest(request, tenant.orgId);
    const project = await updateProject(
      db,
      tenant,
      await projectId(context),
      await readSmallJson(request),
    );
    return project
      ? Response.json({ project })
      : Response.json({ error: "Project not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const tenant = await currentTenant();
    verifyMutationRequest(request, tenant.orgId);
    const project = await archiveProject(db, tenant, await projectId(context));
    return project
      ? Response.json({ project })
      : Response.json({ error: "Project not found" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}
