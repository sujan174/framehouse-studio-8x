import { and, count, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { generationImages, imageGenerations, projects, referenceImages } from "../db/schema";
import { getProject } from "../projects/repository";
import type { TenantContext } from "../tenant";

type Database = NodePgDatabase<Record<string, never>>;
export const generationInputSchema = z.strictObject({
  prompt: z.string().trim().min(1).max(2048),
  steps: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  clientRequestId: z.uuid(),
  referenceGenerationId: z.uuid().optional(),
  referenceUploadId: z.uuid().optional(),
}).refine((value) => !(value.referenceGenerationId && value.referenceUploadId))
  .refine((value) => !(value.referenceGenerationId || value.referenceUploadId) || value.steps === 4);
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
export class UnavailableReferenceError extends Error { constructor() { super("Reference is unavailable in this project"); } }
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
  const rows = await db.select({ generation: imageGenerations }).from(imageGenerations)
    .innerJoin(projects, and(eq(projects.id, imageGenerations.projectId), eq(projects.clerkOrgId, imageGenerations.clerkOrgId)))
    .where(and(eq(projects.id, projectId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt),
      eq(imageGenerations.clerkOrgId, tenant.orgId)))
    .orderBy(desc(imageGenerations.createdAt)).limit(100);
  return rows.map((row) => row.generation);
}

export async function getGeneration(db: Database, tenant: TenantContext, projectId: string, id: string) {
  const rows = await db.select({ generation: imageGenerations }).from(imageGenerations)
    .innerJoin(projects, and(eq(projects.id, imageGenerations.projectId), eq(projects.clerkOrgId, imageGenerations.clerkOrgId)))
    .where(and(
    eq(projects.id, projectId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt),
    eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.id, id),
  )).limit(1);
  return rows[0]?.generation ?? null;
}

export async function getGenerationImage(db: Database, tenant: TenantContext, projectId: string, id: string) {
  const rows = await db.select({ imageBase64: generationImages.imageBase64 })
    .from(generationImages)
    .innerJoin(imageGenerations, and(eq(imageGenerations.id, generationImages.generationId), eq(imageGenerations.clerkOrgId, generationImages.clerkOrgId)))
    .innerJoin(projects, and(eq(projects.id, imageGenerations.projectId), eq(projects.clerkOrgId, imageGenerations.clerkOrgId)))
    .where(and(eq(projects.id, projectId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt),
      eq(imageGenerations.id, id), eq(imageGenerations.status, "succeeded"),
      eq(generationImages.clerkOrgId, tenant.orgId))).limit(1);
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
      if (existing[0].projectId !== projectId || existing[0].prompt !== parsed.prompt || existing[0].steps !== parsed.steps ||
          existing[0].referenceGenerationId !== (parsed.referenceGenerationId ?? null) ||
          existing[0].referenceUploadId !== (parsed.referenceUploadId ?? null))
        throw new SubmissionConflictError();
      return existing[0];
    }
    if (parsed.referenceGenerationId) {
      const source = await tx.select({ id: generationImages.generationId }).from(generationImages)
        .innerJoin(imageGenerations, and(eq(imageGenerations.id, generationImages.generationId),
          eq(imageGenerations.clerkOrgId, generationImages.clerkOrgId)))
        .where(and(eq(imageGenerations.id, parsed.referenceGenerationId), eq(imageGenerations.projectId, projectId),
          eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.status, "succeeded"))).limit(1);
      if (!source[0]) throw new UnavailableReferenceError();
    }
    if (parsed.referenceUploadId) {
      const source = await tx.select({ id: referenceImages.id }).from(referenceImages).where(and(
        eq(referenceImages.id, parsed.referenceUploadId), eq(referenceImages.projectId, projectId),
        eq(referenceImages.clerkOrgId, tenant.orgId))).limit(1);
      if (!source[0]) throw new UnavailableReferenceError();
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
      model: parsed.referenceGenerationId || parsed.referenceUploadId ? "flux-2-klein-4b" : "flux-1-schnell",
      referenceGenerationId: parsed.referenceGenerationId ?? null,
      referenceUploadId: parsed.referenceUploadId ?? null,
    }).returning();
    return rows[0];
  });
}

export async function getJobReference(db: Database, job: typeof imageGenerations.$inferSelect) {
  if (job.referenceGenerationId) {
    const rows = await db.select({ base64: generationImages.imageBase64 }).from(generationImages)
      .innerJoin(imageGenerations, and(eq(imageGenerations.id, generationImages.generationId),
        eq(imageGenerations.clerkOrgId, generationImages.clerkOrgId)))
      .where(and(eq(imageGenerations.id, job.referenceGenerationId), eq(imageGenerations.projectId, job.projectId),
        eq(imageGenerations.clerkOrgId, job.clerkOrgId), eq(imageGenerations.status, "succeeded"))).limit(1);
    return rows[0] ? Buffer.from(rows[0].base64, "base64") : null;
  }
  if (job.referenceUploadId) {
    const rows = await db.select({ base64: referenceImages.imageBase64 }).from(referenceImages).where(and(
      eq(referenceImages.id, job.referenceUploadId), eq(referenceImages.projectId, job.projectId),
      eq(referenceImages.clerkOrgId, job.clerkOrgId))).limit(1);
    return rows[0] ? Buffer.from(rows[0].base64, "base64") : null;
  }
  return null;
}

export async function finishGeneration(db: Database, id: string, image: Buffer) {
  if (image.length < 4 || image.length > 6_000_000) throw new Error("Invalid image size");
  return db.transaction(async (tx) => {
    const rows = await tx.update(imageGenerations).set({ status: "succeeded", updatedAt: new Date(), completedAt: new Date() })
      .where(and(eq(imageGenerations.id, id), eq(imageGenerations.status, "running"))).returning();
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
