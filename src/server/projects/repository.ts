import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { imageGenerations, projects } from "../db/schema";
import type { TenantContext } from "../tenant";
import { AuthorizationError, RateLimitError } from "../tenant";

export const projectCreateSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
});
export const projectUpdateSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
export type ProjectInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
type Database = NodePgDatabase<Record<string, never>>;
const active = (tenant: TenantContext) =>
  and(eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt));
export async function listProjects(db: Database, tenant: TenantContext) {
  return db
    .select()
    .from(projects)
    .where(active(tenant))
    .orderBy(desc(projects.updatedAt))
    .limit(100);
}
export async function listProjectCovers(db: Database, tenant: TenantContext) {
  const rows = await db.selectDistinctOn([imageGenerations.projectId], {
    projectId: imageGenerations.projectId, generationId: imageGenerations.id,
  }).from(imageGenerations).innerJoin(projects, and(
    eq(projects.id, imageGenerations.projectId), eq(projects.clerkOrgId, imageGenerations.clerkOrgId),
  )).where(and(eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt),
    eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.status, "succeeded")))
    .orderBy(imageGenerations.projectId, desc(imageGenerations.createdAt));
  return Object.fromEntries(rows.map((row) => [row.projectId, row.generationId]));
}
export async function countProjects(db: Database, tenant: TenantContext) {
  const rows = await db
    .select({ total: count() })
    .from(projects)
    .where(active(tenant));
  return rows[0].total;
}
export async function getProject(
  db: Database,
  tenant: TenantContext,
  id: string,
) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(active(tenant), eq(projects.id, id)))
    .limit(1);
  return rows[0] ?? null;
}
export async function createProject(
  db: Database,
  tenant: TenantContext,
  input: unknown,
) {
  const parsed = projectCreateSchema.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${tenant.orgId}), hashtext(${tenant.userId}))`,
    );
    const rows = await tx
      .select({ total: count() })
      .from(projects)
      .where(
        and(
          eq(projects.clerkOrgId, tenant.orgId),
          eq(projects.creatorUserId, tenant.userId),
          gt(projects.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
        ),
      );
    if (rows[0].total >= 20) throw new RateLimitError();
    const created = await tx
      .insert(projects)
      .values({
        ...parsed,
        clerkOrgId: tenant.orgId,
        creatorUserId: tenant.userId,
      })
      .returning();
    return created[0];
  });
}
export async function updateProject(
  db: Database,
  tenant: TenantContext,
  id: string,
  input: unknown,
) {
  const parsed = projectUpdateSchema.parse(input);
  const rows = await db
    .update(projects)
    .set({ ...parsed, updatedAt: new Date() })
    .where(and(active(tenant), eq(projects.id, id)))
    .returning();
  return rows[0] ?? null;
}
export async function archiveProject(
  db: Database,
  tenant: TenantContext,
  id: string,
) {
  const project = await getProject(db, tenant, id);
  if (!project) return null;
  if (project.creatorUserId !== tenant.userId && tenant.role !== "org:admin")
    throw new AuthorizationError();
  return db.transaction(async (tx) => {
    const now = new Date();
    const rows = await tx.update(projects)
      .set({ archivedAt: now, updatedAt: now })
      .where(and(active(tenant), eq(projects.id, id)))
      .returning();
    if (!rows[0]) return null;
    await tx.update(imageGenerations)
      .set({ status: "failed", failureCode: "project_archived", updatedAt: now, completedAt: now })
      .where(and(eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.projectId, id), inArray(imageGenerations.status, ["queued", "running"])));
    return rows[0];
  });
}
