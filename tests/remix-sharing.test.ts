import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { archiveProject, createProject } from "../src/server/projects/repository";
import { claimNextGeneration, createGeneration, finishGeneration, getGeneration, getGenerationImage, getJobReference,
  GenerationBusyError, UnavailableReferenceError, countDailyGenerationUsage } from "../src/server/generations/repository";
import { getReferenceImage, listReferences, normalizeReference, saveReference, InvalidReferenceError } from "../src/server/generations/references";
import { runOneGeneration } from "../src/server/generations/worker";
import { ProviderError } from "../src/server/generations/flux-provider";
import { getPublication, getPublicFrame, getPublicStory, publishStory, revokeStory,
  EmptyStoryError, PublicationForbiddenError } from "../src/server/creative/publication";
import { saveCreativeState } from "../src/server/creative/repository";
import type { TenantContext } from "../src/server/tenant";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required");
const pool = new Pool({ connectionString: url });
const db = drizzle(pool);
const owner: TenantContext = { orgId: "org_alpha", userId: "user_owner", role: "org:member" };
const colleague: TenantContext = { orgId: "org_alpha", userId: "user_colleague", role: "org:member" };
const admin: TenantContext = { orgId: "org_alpha", userId: "user_admin", role: "org:admin" };
const outsider: TenantContext = { orgId: "org_beta", userId: "user_outsider", role: "org:admin" };
beforeAll(async () => { await migrate(db, { migrationsFolder: "./drizzle" }); });
beforeEach(async () => { await db.execute(sql`truncate table projects cascade`); });
afterAll(async () => { await pool.end(); });

async function jpeg() { return sharp({ create: { width: 300, height: 280, channels: 3, background: "#2d7ca0" } }).jpeg().toBuffer(); }
async function successfulImage(projectId: string) {
  const created = (await createGeneration(db, owner, projectId, { prompt: "A blue harbor", steps: 4, clientRequestId: crypto.randomUUID() }))!;
  expect((await claimNextGeneration(db))?.id).toBe(created.id);
  await finishGeneration(db, created.id, await jpeg());
  return created.id;
}

describe("private reference and remix", () => {
  it("rejects fake, tiny, animated and oversized uploads and normalizes metadata", async () => {
    await expect(normalizeReference(Buffer.from("<svg></svg>"))).rejects.toBeInstanceOf(InvalidReferenceError);
    await expect(normalizeReference(await sharp({ create: { width: 40, height: 40, channels: 3, background: "red" } }).png().toBuffer())).rejects.toBeInstanceOf(InvalidReferenceError);
    await expect(normalizeReference(Buffer.alloc(5_000_001))).rejects.toBeInstanceOf(InvalidReferenceError);
    const result = await normalizeReference(await jpeg());
    expect(await sharp(result).metadata()).toMatchObject({ format: "jpeg", width: 300, height: 280 });
  });
  it("scopes upload reads and remix references to the exact project and workspace", async () => {
    const first = await createProject(db, owner, { title: "First" });
    const second = await createProject(db, owner, { title: "Second" });
    const foreign = await createProject(db, outsider, { title: "Foreign" });
    const image = await successfulImage(first.id);
    const upload = (await saveReference(db, owner, first.id, await jpeg()))!;
    expect((await listReferences(db, owner, first.id))?.map((item) => item.id)).toContain(upload.id);
    expect(await getReferenceImage(db, outsider, first.id, upload.id)).toBeNull();
    expect(await getReferenceImage(db, owner, second.id, upload.id)).toBeNull();
    expect(await saveReference(db, outsider, first.id, await jpeg())).toBeNull();
    expect(await getReferenceImage(db, owner, first.id, upload.id)).not.toBeNull();
    const valid = (await createGeneration(db, owner, first.id, { prompt: "Make the blue harbor golden", steps: 4,
      referenceUploadId: upload.id, clientRequestId: crypto.randomUUID() }))!;
    expect(valid.model).toBe("flux-2-klein-4b");
    expect(await getJobReference(db, valid)).not.toBeNull();
    expect(await countDailyGenerationUsage(db, owner)).toBe(2);
    await expect(createGeneration(db, owner, second.id, { prompt: "Steal", steps: 4, referenceUploadId: upload.id,
      clientRequestId: crypto.randomUUID() })).rejects.toBeInstanceOf(UnavailableReferenceError);
    await expect(createGeneration(db, outsider, foreign.id, { prompt: "Steal", steps: 4, referenceGenerationId: image,
      clientRequestId: crypto.randomUUID() })).rejects.toBeInstanceOf(UnavailableReferenceError);
    await expect(createGeneration(db, owner, second.id, { prompt: "Steal", steps: 4, referenceGenerationId: image,
      clientRequestId: crypto.randomUUID() })).rejects.toBeInstanceOf(UnavailableReferenceError);
    expect(await getGenerationImage(db, outsider, first.id, image)).toBeNull();
    await expect(createGeneration(db, owner, first.id, { prompt: "Unsupported setting", steps: 8,
      referenceUploadId: upload.id, clientRequestId: crypto.randomUUID() })).rejects.toThrow();
  });
  it("deduplicates a remix and blocks concurrent calls under the existing budget", async () => {
    const project = await createProject(db, owner, { title: "Remix" });
    const upload = (await saveReference(db, owner, project.id, await jpeg()))!;
    const request = { prompt: "Move to sunset", steps: 4, referenceUploadId: upload.id, clientRequestId: crypto.randomUUID() };
    const [a, b] = await Promise.all([createGeneration(db, owner, project.id, request), createGeneration(db, owner, project.id, request)]);
    expect(a?.id).toBe(b?.id);
    expect(await countDailyGenerationUsage(db, owner)).toBe(1);
    await expect(createGeneration(db, owner, project.id, { ...request, clientRequestId: crypto.randomUUID() })).rejects.toBeInstanceOf(GenerationBusyError);
  });
  it("records a failed remix honestly without modifying the source", async () => {
    const project = await createProject(db, owner, { title: "Failed remix" });
    const source = await successfulImage(project.id);
    const original = await getGenerationImage(db, owner, project.id, source);
    const remix = (await createGeneration(db, owner, project.id, { prompt: "Change the weather", steps: 4,
      referenceGenerationId: source, clientRequestId: crypto.randomUUID() }))!;
    await runOneGeneration(db, pool, async (job, reference) => {
      expect(job.id).toBe(remix.id);
      expect(reference).toEqual(original);
      throw new ProviderError("provider_quota");
    });
    expect(await getGenerationImage(db, owner, project.id, remix.id)).toBeNull();
    expect(await getGenerationImage(db, owner, project.id, source)).toEqual(original);
    expect((await getGeneration(db, owner, project.id, remix.id))?.failureCode).toBe("provider_quota");
  });
});

describe("story publication", () => {
  it("publishes an exact snapshot and revokes all public frames", async () => {
    const project = await createProject(db, owner, { title: "Blue story" });
    const image = await successfulImage(project.id);
    await saveCreativeState(db, owner, project.id, { revision: 0, shortlist: [], frames: [{ generationId: image, caption: "Opening" }] });
    const shared = (await publishStory(db, owner, project.id))!;
    expect(shared.token).toMatch(/^[a-f0-9]{64}$/);
    expect(await getPublicStory(db, shared.token!)).toEqual({ title: "Blue story", frameCount: 1, frames: [{ caption: "Opening" }] });
    expect(await sharp((await getPublicFrame(db, shared.token!, 0))!).metadata()).toMatchObject({ format: "jpeg" });
    expect(await getPublicFrame(db, shared.token!, 1)).toBeNull();
    await saveCreativeState(db, owner, project.id, { revision: 1, shortlist: [], frames: [{ generationId: image, caption: "Changed privately" }] });
    expect((await getPublicStory(db, shared.token!))?.frames[0].caption).toBe("Opening");
    await revokeStory(db, owner, project.id);
    expect(await getPublicStory(db, shared.token!)).toBeNull();
    expect(await getPublicFrame(db, shared.token!, 0)).toBeNull();
    const next = (await publishStory(db, owner, project.id))!;
    expect(next.token).not.toBe(shared.token);
    expect(await getPublicStory(db, shared.token!)).toBeNull();
    expect((await getPublicStory(db, next.token!))?.frames[0].caption).toBe("Changed privately");
  });
  it("enforces publication roles, project ownership, archived visibility, and empty boards", async () => {
    const project = await createProject(db, owner, { title: "Private" });
    await expect(publishStory(db, owner, project.id)).rejects.toBeInstanceOf(EmptyStoryError);
    await expect(publishStory(db, colleague, project.id)).rejects.toBeInstanceOf(PublicationForbiddenError);
    expect(await publishStory(db, outsider, project.id)).toBeNull();
    const image = await successfulImage(project.id);
    await saveCreativeState(db, owner, project.id, { revision: 0, shortlist: [], frames: [{ generationId: image, caption: "One" }] });
    const shared = (await publishStory(db, admin, project.id))!;
    expect((await getPublication(db, colleague, project.id))?.token).toBeNull();
    expect((await getPublication(db, owner, project.id))?.token).toBe(shared.token);
    await expect(revokeStory(db, colleague, project.id)).rejects.toBeInstanceOf(PublicationForbiddenError);
    expect(await revokeStory(db, outsider, project.id)).toBeNull();
    await archiveProject(db, owner, project.id);
    expect(await getPublicStory(db, shared.token!)).toBeNull();
    expect(await getPublicFrame(db, shared.token!, 0)).toBeNull();
  });
});
