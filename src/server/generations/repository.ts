import { and, count, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { generationImages, imageGenerations, projects } from "../db/schema";
import { getProject } from "../projects/repository";
import type { TenantContext } from "../tenant";

type Database = NodePgDatabase<Record<string, never>>;
export const generationInputSchema = z.strictObject({
  prompt: z.string().trim().min(1).max(2048),
  steps: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  clientRequestId: z.uuid(),
});
export type GenerationFailure = "provider_timeout" | "provider_quota" | "provider_unavailable" | "invalid_output" | "interrupted" | "configuration" | "project_archived";
export class GenerationBusyError extends Error {
  constructor() { super("A generation is already in progress"); }
}
export class SubmissionConflictError extends Error {
  constructor() { super("Submission key already used for different input"); }
}
export class GenerationLimitError extends Error {
  constructor() { super("Daily image limit reached"); }
}
export const USER_DAILY_LIMIT = 5;
export const GLOBAL_DAILY_LIMIT = 20;
function utcDayStart() { const day = new Date(); day.setUTCHours(0, 0, 0, 0); return day; }

export async function countDailyGenerationUsage(db: Database, tenant: TenantContext) {
  const rows = await db.select({ total: count() }).from(imageGenerations).where(and(
    eq(imageGenerations.clerkOrgId, tenant.orgId),
    eq(imageGenerations.creatorUserId, tenant.userId),
    gt(imageGenerations.createdAt, utcDayStart()),
  ));
  return rows[0].total;
}

export async function listGenerations(db: Database, tenant: TenantContext, projectId: string) {
  if (!(await getProject(db, tenant, projectId))) return null;
  return db.select().from(imageGenerations)
    .where(and(eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.projectId, projectId)))
    .orderBy(desc(imageGenerations.createdAt)).limit(100);
}

export async function getGeneration(db: Database, tenant: TenantContext, projectId: string, id: string) {
  if (!(await getProject(db, tenant, projectId))) return null;
  const rows = await db.select().from(imageGenerations).where(and(
    eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.projectId, projectId), eq(imageGenerations.id, id),
  )).limit(1);
  return rows[0] ?? null;
}

export async function getGenerationImage(db: Database, tenant: TenantContext, projectId: string, id: string) {
  const generation = await getGeneration(db, tenant, projectId, id);
  if (!generation || generation.status !== "succeeded") return null;
  const rows = await db.select({ imageBase64: generationImages.imageBase64 })
    .from(generationImages).where(and(eq(generationImages.generationId, id), eq(generationImages.clerkOrgId, tenant.orgId))).limit(1);
  return rows[0] ? Buffer.from(rows[0].imageBase64, "base64") : null;
}

export async function createGeneration(db: Database, tenant: TenantContext, projectId: string, input: unknown) {
  const parsed = generationInputSchema.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(481153, 1)`);
    const project = await tx.select({ id: projects.id }).from(projects).where(and(
      eq(projects.id, projectId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt),
    )).for("share").limit(1);
    if (!project[0]) return null;
    const existing = await tx.select().from(imageGenerations).where(and(
      eq(imageGenerations.clerkOrgId, tenant.orgId),
      eq(imageGenerations.creatorUserId, tenant.userId),
      eq(imageGenerations.clientRequestId, parsed.clientRequestId),
    )).limit(1);
    if (existing[0]) {
      if (existing[0].projectId !== projectId || existing[0].prompt !== parsed.prompt || existing[0].steps !== parsed.steps)
        throw new SubmissionConflictError();
      return existing[0];
    }
    const busy = await tx.select({ total: count() }).from(imageGenerations).where(and(
      eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.creatorUserId, tenant.userId),
      inArray(imageGenerations.status, ["queued", "running"]),
    ));
    if (busy[0].total > 0) throw new GenerationBusyError();
    const dayStart = utcDayStart();
    const userDay = await tx.select({ total: count() }).from(imageGenerations).where(and(
      eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.creatorUserId, tenant.userId),
      gt(imageGenerations.createdAt, dayStart),
    ));
    const globalDay = await tx.select({ total: count() }).from(imageGenerations)
      .where(gt(imageGenerations.createdAt, dayStart));
    const queued = await tx.select({ total: count() }).from(imageGenerations)
      .where(eq(imageGenerations.status, "queued"));
    if (userDay[0].total >= USER_DAILY_LIMIT || globalDay[0].total >= GLOBAL_DAILY_LIMIT || queued[0].total >= 5)
      throw new GenerationLimitError();
    const rows = await tx.insert(imageGenerations).values({
      clerkOrgId: tenant.orgId,
      projectId,
      creatorUserId: tenant.userId,
      clientRequestId: parsed.clientRequestId,
      prompt: parsed.prompt,
      steps: parsed.steps,
    }).returning();
    return rows[0];
  });
}

export async function finishGeneration(db: Database, id: string, image: Buffer) {
  if (image.length < 4 || image.length > 6_000_000) throw new Error("Invalid image size");
  return db.transaction(async (tx) => {
    const rows = await tx.update(imageGenerations).set({ status: "succeeded", updatedAt: new Date(), completedAt: new Date() })
      .where(and(eq(imageGenerations.id, id), inArray(imageGenerations.status, ["queued", "running"]))).returning();
    if (!rows[0]) return null;
    await tx.insert(generationImages).values({ generationId: id, clerkOrgId: rows[0].clerkOrgId, imageBase64: image.toString("base64") });
    return rows[0];
  });
}

export async function failGeneration(db: Database, id: string, code: GenerationFailure) {
  const rows = await db.update(imageGenerations).set({
    status: "failed", failureCode: code, updatedAt: new Date(), completedAt: new Date(),
  }).where(and(eq(imageGenerations.id, id), inArray(imageGenerations.status, ["queued", "running"]))).returning();
  return rows[0] ?? null;
}

export async function recoverStaleGenerations(db: Database) {
  return db.update(imageGenerations).set({
    status: "failed", failureCode: "interrupted", updatedAt: new Date(), completedAt: new Date(),
  }).where(and(eq(imageGenerations.status, "running"), lt(imageGenerations.startedAt, new Date(Date.now() - 2 * 60_000)))).returning();
}

export async function claimNextGeneration(db: Database) {
  return db.transaction(async (tx) => {
    const next = await tx.select({ generation: imageGenerations }).from(imageGenerations)
      .innerJoin(projects, and(eq(projects.id, imageGenerations.projectId), eq(projects.clerkOrgId, imageGenerations.clerkOrgId)))
      .where(and(eq(imageGenerations.status, "queued"), isNull(projects.archivedAt)))
      .orderBy(imageGenerations.createdAt).limit(1)
      .for("update", { of: imageGenerations, skipLocked: true });
    if (!next[0]) return null;
    const rows = await tx.update(imageGenerations).set({
      status: "running", startedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(imageGenerations.id, next[0].generation.id), eq(imageGenerations.status, "queued"))).returning();
    return rows[0] ?? null;
  });
}
