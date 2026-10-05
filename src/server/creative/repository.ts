import { and, eq, inArray, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { imageGenerations, projectCreativeStates, projects } from "../db/schema";
import type { TenantContext } from "../tenant";

type Database = NodePgDatabase<Record<string, never>>;
const frameSchema = z.strictObject({ generationId: z.uuid(), caption: z.string().trim().max(160) });
export const creativeInputSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  shortlist: z.array(z.uuid()).max(12),
  frames: z.array(frameSchema).max(8),
}).refine((value) => new Set(value.shortlist).size === value.shortlist.length)
  .refine((value) => new Set(value.frames.map((frame) => frame.generationId)).size === value.frames.length);
export type CreativeStateView = { revision: number; shortlist: string[]; frames: { generationId: string; caption: string }[] };
export class StaleCreativeStateError extends Error { constructor() { super("Creative state changed"); } }
export class InvalidCreativeImageError extends Error { constructor() { super("Image is unavailable in this project"); } }

export async function getCreativeState(db: Database, tenant: TenantContext, projectId: string): Promise<CreativeStateView | null> {
  const rows = await db.select({ state: projectCreativeStates }).from(projects)
    .leftJoin(projectCreativeStates, and(eq(projectCreativeStates.projectId, projects.id), eq(projectCreativeStates.clerkOrgId, projects.clerkOrgId)))
    .where(and(eq(projects.id, projectId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt))).limit(1);
  if (!rows[0]) return null;
  return rows[0].state ? { revision: rows[0].state.revision, shortlist: rows[0].state.shortlist, frames: rows[0].state.frames }
    : { revision: 0, shortlist: [], frames: [] };
}

export async function saveCreativeState(db: Database, tenant: TenantContext, projectId: string, input: unknown): Promise<CreativeStateView | null> {
  const parsed = creativeInputSchema.parse(input);
  return db.transaction(async (tx) => {
    const project = await tx.select({ id: projects.id }).from(projects).where(and(
      eq(projects.id, projectId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt),
    )).for("share").limit(1);
    if (!project[0]) return null;
    await tx.insert(projectCreativeStates).values({ projectId, clerkOrgId: tenant.orgId })
      .onConflictDoNothing();
    const state = await tx.select().from(projectCreativeStates).where(and(
      eq(projectCreativeStates.projectId, projectId), eq(projectCreativeStates.clerkOrgId, tenant.orgId),
    )).for("update").limit(1);
    if (state[0].revision !== parsed.revision) throw new StaleCreativeStateError();
    const ids = [...new Set([...parsed.shortlist, ...parsed.frames.map((frame) => frame.generationId)])];
    if (ids.length) {
      const valid = await tx.select({ id: imageGenerations.id }).from(imageGenerations).where(and(
        inArray(imageGenerations.id, ids), eq(imageGenerations.clerkOrgId, tenant.orgId),
        eq(imageGenerations.projectId, projectId), eq(imageGenerations.status, "succeeded"),
      ));
      if (valid.length !== ids.length) throw new InvalidCreativeImageError();
    }
    const rows = await tx.update(projectCreativeStates).set({
      shortlist: parsed.shortlist, frames: parsed.frames, revision: parsed.revision + 1, updatedAt: new Date(),
    }).where(and(eq(projectCreativeStates.projectId, projectId), eq(projectCreativeStates.clerkOrgId, tenant.orgId))).returning();
    return { revision: rows[0].revision, shortlist: rows[0].shortlist, frames: rows[0].frames };
  });
}
