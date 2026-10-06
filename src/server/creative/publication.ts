import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { generationImages, imageGenerations, projectCreativeStates, projects, publishedStories } from "../db/schema";
import type { TenantContext } from "../tenant";

type Database = NodePgDatabase<Record<string, never>>;
export class EmptyStoryError extends Error { constructor() { super("Add a frame before publishing"); } }
export class PublicationForbiddenError extends Error { constructor() { super("Only the project owner or a workspace admin can publish"); } }

export async function getPublication(db: Database, tenant: TenantContext, projectId: string) {
  const rows = await db.select({ project: projects, publication: publishedStories }).from(projects)
    .leftJoin(publishedStories, and(eq(publishedStories.projectId, projects.id), eq(publishedStories.clerkOrgId, projects.clerkOrgId)))
    .where(and(eq(projects.id, projectId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt))).limit(1);
  if (!rows[0]) return null;
  const canManage = rows[0].project.creatorUserId === tenant.userId || tenant.role === "org:admin";
  const publication = rows[0].publication;
  return { published: Boolean(publication && !publication.revokedAt), canManage,
    token: canManage && publication && !publication.revokedAt ? publication.token : null };
}

export async function publishStory(db: Database, tenant: TenantContext, projectId: string) {
  return db.transaction(async (tx) => {
    const found = await tx.select().from(projects).where(and(eq(projects.id, projectId),
      eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt))).for("update").limit(1);
    const project = found[0];
    if (!project) return null;
    if (project.creatorUserId !== tenant.userId && tenant.role !== "org:admin") throw new PublicationForbiddenError();
    const existing = await tx.select().from(publishedStories).where(and(eq(publishedStories.projectId, projectId),
      eq(publishedStories.clerkOrgId, tenant.orgId))).limit(1);
    if (existing[0] && !existing[0].revokedAt) return { published: true, canManage: true, token: existing[0].token };
    const state = await tx.select().from(projectCreativeStates).where(and(eq(projectCreativeStates.projectId, projectId),
      eq(projectCreativeStates.clerkOrgId, tenant.orgId))).limit(1);
    if (!state[0]?.frames.length) throw new EmptyStoryError();
    // The creative-state save already checked ownership, but verify at publish time too.
    for (const frame of state[0].frames) {
      const image = await tx.select({ id: imageGenerations.id }).from(imageGenerations)
        .innerJoin(generationImages, and(eq(generationImages.generationId, imageGenerations.id),
          eq(generationImages.clerkOrgId, imageGenerations.clerkOrgId)))
        .where(and(eq(imageGenerations.id, frame.generationId), eq(imageGenerations.projectId, projectId),
          eq(imageGenerations.clerkOrgId, tenant.orgId), eq(imageGenerations.status, "succeeded"))).limit(1);
      if (!image[0]) throw new EmptyStoryError();
    }
    const token = randomBytes(32).toString("hex");
    const snapshot = { clerkOrgId: tenant.orgId, token, title: project.title, frames: state[0].frames,
      publishedAt: new Date(), revokedAt: null };
    await tx.insert(publishedStories).values({ projectId, ...snapshot }).onConflictDoUpdate({
      target: publishedStories.projectId, set: snapshot,
    });
    return { published: true, canManage: true, token };
  });
}

export async function revokeStory(db: Database, tenant: TenantContext, projectId: string) {
  return db.transaction(async (tx) => {
    const found = await tx.select().from(projects).where(and(eq(projects.id, projectId),
      eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt))).for("update").limit(1);
    const project = found[0];
    if (!project) return null;
    if (project.creatorUserId !== tenant.userId && tenant.role !== "org:admin") throw new PublicationForbiddenError();
    await tx.update(publishedStories).set({ revokedAt: new Date() }).where(and(eq(publishedStories.projectId, projectId),
      eq(publishedStories.clerkOrgId, tenant.orgId), isNull(publishedStories.revokedAt)));
    return { published: false, canManage: true, token: null };
  });
}

export async function getPublicStory(db: Database, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const rows = await db.select({ story: publishedStories }).from(publishedStories)
    .innerJoin(projects, and(eq(projects.id, publishedStories.projectId), eq(projects.clerkOrgId, publishedStories.clerkOrgId)))
    .where(and(eq(publishedStories.token, token), isNull(publishedStories.revokedAt), isNull(projects.archivedAt))).limit(1);
  if (!rows[0]) return null;
  return { title: rows[0].story.title, frames: rows[0].story.frames.map((frame) => ({ caption: frame.caption })),
    frameCount: rows[0].story.frames.length };
}

export async function getPublicFrame(db: Database, token: string, index: number) {
  if (!/^[a-f0-9]{64}$/.test(token) || !Number.isInteger(index) || index < 0 || index >= 8) return null;
  const rows = await db.select({ story: publishedStories }).from(publishedStories)
    .innerJoin(projects, and(eq(projects.id, publishedStories.projectId), eq(projects.clerkOrgId, publishedStories.clerkOrgId)))
    .where(and(eq(publishedStories.token, token), isNull(publishedStories.revokedAt), isNull(projects.archivedAt))).limit(1);
  const story = rows[0]?.story;
  const frame = story?.frames[index];
  if (!story || !frame) return null;
  const image = await db.select({ base64: generationImages.imageBase64 }).from(generationImages)
    .innerJoin(imageGenerations, and(eq(imageGenerations.id, generationImages.generationId),
      eq(imageGenerations.clerkOrgId, generationImages.clerkOrgId)))
    .where(and(eq(imageGenerations.id, frame.generationId), eq(imageGenerations.projectId, story.projectId),
      eq(imageGenerations.clerkOrgId, story.clerkOrgId), eq(imageGenerations.status, "succeeded"))).limit(1);
  return image[0] ? Buffer.from(image[0].base64, "base64") : null;
}
