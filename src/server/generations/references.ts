import sharp from "sharp";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { projects, referenceImages } from "../db/schema";
import { getProject } from "../projects/repository";
import type { TenantContext } from "../tenant";

type Database = NodePgDatabase<Record<string, never>>;
export class InvalidReferenceError extends Error { constructor() { super("Invalid reference image"); } }
export class ReferenceLimitError extends Error { constructor() { super("Reference limit reached"); } }
export const MAX_UPLOAD_BYTES = 5_000_000;

export async function normalizeReference(bytes: Buffer): Promise<Buffer> {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new InvalidReferenceError();
  try {
    const input = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "error" });
    const meta = await input.metadata();
    if (!meta.width || !meta.height || meta.width < 64 || meta.height < 64 ||
        meta.width > 6000 || meta.height > 6000 || (meta.pages ?? 1) !== 1 ||
        !["jpeg", "png", "webp"].includes(meta.format ?? "")) throw new InvalidReferenceError();
    const output = await input.rotate().resize(500, 500, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const checked = await sharp(output).metadata();
    if (!checked.width || !checked.height || checked.width >= 512 || checked.height >= 512 || output.length > 1_000_000)
      throw new InvalidReferenceError();
    return output;
  } catch { throw new InvalidReferenceError(); }
}

export async function listReferences(db: Database, tenant: TenantContext, projectId: string) {
  const project = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId),
    eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt))).limit(1);
  if (!project[0]) return null;
  return db.select({ id: referenceImages.id, createdAt: referenceImages.createdAt }).from(referenceImages)
    .where(and(eq(referenceImages.projectId, projectId), eq(referenceImages.clerkOrgId, tenant.orgId)))
    .orderBy(desc(referenceImages.createdAt)).limit(12);
}

export async function saveReference(db: Database, tenant: TenantContext, projectId: string, bytes: Buffer) {
  if (!(await getProject(db, tenant, projectId))) return null;
  const image = await normalizeReference(bytes);
  return db.transaction(async (tx) => {
    const project = await tx.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId),
      eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt))).for("update").limit(1);
    if (!project[0]) return null;
    const counted = await tx.select({ total: count() }).from(referenceImages).where(and(
      eq(referenceImages.projectId, projectId), eq(referenceImages.clerkOrgId, tenant.orgId)));
    if (counted[0].total >= 12) throw new ReferenceLimitError();
    const rows = await tx.insert(referenceImages).values({ projectId, clerkOrgId: tenant.orgId,
      creatorUserId: tenant.userId, imageBase64: image.toString("base64") }).returning({ id: referenceImages.id, createdAt: referenceImages.createdAt });
    return rows[0];
  });
}

export async function getReferenceImage(db: Database, tenant: TenantContext, projectId: string, id: string) {
  const rows = await db.select({ base64: referenceImages.imageBase64 }).from(referenceImages)
    .innerJoin(projects, and(eq(projects.id, referenceImages.projectId), eq(projects.clerkOrgId, referenceImages.clerkOrgId)))
    .where(and(eq(referenceImages.id, id), eq(referenceImages.projectId, projectId),
      eq(referenceImages.clerkOrgId, tenant.orgId), eq(projects.clerkOrgId, tenant.orgId), isNull(projects.archivedAt))).limit(1);
  return rows[0] ? Buffer.from(rows[0].base64, "base64") : null;
}
