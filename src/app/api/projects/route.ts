import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { createProject, listProjects } from "@/server/projects/repository";
import {
  errorResponse,
  readSmallJson,
  verifyMutationRequest,
} from "@/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const tenant = await currentTenant();
    return Response.json(
      { projects: await listProjects(db, tenant) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const tenant = await currentTenant();
    verifyMutationRequest(request, tenant.orgId);
    const project = await createProject(
      db,
      tenant,
      await readSmallJson(request),
    );
    return Response.json(
      { project },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
