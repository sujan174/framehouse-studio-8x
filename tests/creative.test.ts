import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { archiveProject, createProject } from "../src/server/projects/repository";
import { claimNextGeneration, createGeneration, finishGeneration, countDailyGenerationUsage } from "../src/server/generations/repository";
import { getCreativeState, saveCreativeState, InvalidCreativeImageError, StaleCreativeStateError } from "../src/server/creative/repository";
import { renderContactSheet } from "../src/server/creative/export";
import type { TenantContext } from "../src/server/tenant";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required");
const pool = new Pool({ connectionString: url });
const db = drizzle(pool);
const alpha: TenantContext = { orgId: "org_alpha", userId: "user_one", role: "org:member" };
const beta: TenantContext = { orgId: "org_beta", userId: "user_two", role: "org:member" };
beforeAll(async () => { await migrate(db, { migrationsFolder: "./drizzle" }); });
beforeEach(async () => { await db.execute(sql`truncate table projects cascade`); });
afterAll(async () => { await pool.end(); });

async function successfulImage(tenant: TenantContext, projectId: string, prompt: string) {
  const created = await createGeneration(db, tenant, projectId, { prompt, steps: 4, clientRequestId: crypto.randomUUID() });
  expect(created).not.toBeNull();
  expect((await claimNextGeneration(db))?.id).toBe(created!.id);
  const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#c3d6bd" } }).jpeg().toBuffer();
  await finishGeneration(db, created!.id, jpeg);
  return created!.id;
}

describe("project curation and export", () => {
  it("persists selection and ordered captions without using generation quota", async () => {
    const project = await createProject(db, alpha, { title: "A visual study" });
    const image = await successfulImage(alpha, project.id, "A quiet river");
    const before = await countDailyGenerationUsage(db, alpha);
    expect(await saveCreativeState(db, alpha, project.id, { revision: 0, shortlist: [image], frames: [{ generationId: image, caption: "First light" }] }))
      .toEqual({ revision: 1, shortlist: [image], frames: [{ generationId: image, caption: "First light" }] });
    expect(await getCreativeState(db, alpha, project.id)).toMatchObject({ revision: 1, shortlist: [image] });
    expect(await countDailyGenerationUsage(db, alpha)).toBe(before);
    const exportResult = await renderContactSheet(db, alpha, project.id);
    expect(exportResult && !exportResult.empty).toBe(true);
    if (exportResult && !exportResult.empty) {
      expect(exportResult.png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(await sharp(exportResult.png).metadata()).toMatchObject({ width: 1600, format: "png" });
    }
  });

  it("rejects cross-workspace, mixed-project, forged and unsuccessful image IDs", async () => {
    const a = await createProject(db, alpha, { title: "Alpha" });
    const another = await createProject(db, alpha, { title: "Another" });
    const b = await createProject(db, beta, { title: "Beta" });
    const aImage = await successfulImage(alpha, a.id, "First image");
    const anotherImage = await successfulImage(alpha, another.id, "Other image");
    const bImage = await successfulImage(beta, b.id, "Private image");
    expect(await getCreativeState(db, beta, a.id)).toBeNull();
    expect(await saveCreativeState(db, beta, a.id, { revision: 0, shortlist: [aImage], frames: [] })).toBeNull();
    for (const badId of [anotherImage, bImage, crypto.randomUUID()]) {
      await expect(saveCreativeState(db, alpha, a.id, { revision: 0, shortlist: [aImage, badId], frames: [] })).rejects.toBeInstanceOf(InvalidCreativeImageError);
      await expect(saveCreativeState(db, alpha, a.id, { revision: 0, shortlist: [], frames: [{ generationId: badId, caption: "Forged" }] })).rejects.toBeInstanceOf(InvalidCreativeImageError);
    }
    await expect(saveCreativeState(db, alpha, a.id, { revision: 0, shortlist: [aImage], frames: [], orgId: beta.orgId })).rejects.toThrow();
    expect(await renderContactSheet(db, beta, a.id)).toBeNull();
  });

  it("rejects stale edits and hides archived boards and exports", async () => {
    const project = await createProject(db, alpha, { title: "Archived board" });
    const image = await successfulImage(alpha, project.id, "A portrait");
    await saveCreativeState(db, alpha, project.id, { revision: 0, shortlist: [image], frames: [{ generationId: image, caption: "Before" }] });
    await expect(saveCreativeState(db, alpha, project.id, { revision: 0, shortlist: [], frames: [] })).rejects.toBeInstanceOf(StaleCreativeStateError);
    await archiveProject(db, alpha, project.id);
    expect(await getCreativeState(db, alpha, project.id)).toBeNull();
    expect(await renderContactSheet(db, alpha, project.id)).toBeNull();
    expect(await saveCreativeState(db, alpha, project.id, { revision: 1, shortlist: [], frames: [] })).toBeNull();
  });
});
