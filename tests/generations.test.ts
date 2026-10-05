import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { archiveProject, createProject } from "../src/server/projects/repository";
import type { TenantContext } from "../src/server/tenant";
import {
  createGeneration,
  getGeneration,
  getGenerationImage,
  listGenerations,
  finishGeneration,
  failGeneration,
  recoverStaleGenerations,
} from "../src/server/generations/repository";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required");
const pool = new Pool({ connectionString: url });
const db = drizzle(pool);
const alice: TenantContext = { userId: "user_alice", orgId: "org_a", role: "org:member" };
const bob: TenantContext = { userId: "user_bob", orgId: "org_b", role: "org:member" };

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});
beforeEach(async () => {
  await db.execute(sql`truncate table generation_images, image_generations, projects cascade`);
});
afterAll(async () => pool.end());

describe("image generation ownership", () => {
  it("keeps submissions, feed, preview and download scoped to the active project and workspace", async () => {
    const a = await createProject(db, alice, { title: "Alpha" });
    const b = await createProject(db, bob, { title: "Beta" });
    const request = { prompt: "A copper lantern in a rainy forest", steps: 4, clientRequestId: crypto.randomUUID() };
    expect(await createGeneration(db, bob, a.id, request)).toBeNull();
    const generation = await createGeneration(db, alice, a.id, request);
    expect(generation).not.toBeNull();
    expect(await listGenerations(db, bob, a.id)).toBeNull();
    expect(await getGeneration(db, bob, b.id, generation!.id)).toBeNull();
    expect(await getGenerationImage(db, bob, b.id, generation!.id)).toBeNull();
    await finishGeneration(db, generation!.id, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    expect((await getGenerationImage(db, alice, a.id, generation!.id))?.length).toBe(4);
    expect(await getGenerationImage(db, bob, a.id, generation!.id)).toBeNull();
    expect((await listGenerations(db, alice, a.id))?.[0].prompt).toBe(request.prompt);
  });

  it("rejects forged ownership fields and invalid model settings", async () => {
    const project = await createProject(db, alice, { title: "Alpha" });
    const base = { prompt: "A glass sculpture", steps: 4, clientRequestId: crypto.randomUUID() };
    await expect(createGeneration(db, alice, project.id, { ...base, orgId: bob.orgId })).rejects.toThrow();
    await expect(createGeneration(db, alice, project.id, { ...base, steps: 9 })).rejects.toThrow();
    await expect(createGeneration(db, alice, project.id, { ...base, prompt: " " })).rejects.toThrow();
  });

  it("does not enqueue work for an archived project", async () => {
    const project = await createProject(db, alice, { title: "Archived" });
    await archiveProject(db, alice, project.id);
    expect(await createGeneration(db, alice, project.id, {
      prompt: "A private skyline", steps: 4, clientRequestId: crypto.randomUUID(),
    })).toBeNull();
  });

  it("deduplicates a repeated submission key and bounds outstanding work", async () => {
    const project = await createProject(db, alice, { title: "Alpha" });
    const input = { prompt: "Red dunes at dusk", steps: 4, clientRequestId: crypto.randomUUID() };
    const first = await createGeneration(db, alice, project.id, input);
    const again = await createGeneration(db, alice, project.id, input);
    expect(again?.id).toBe(first?.id);
    await expect(createGeneration(db, alice, project.id, { ...input, clientRequestId: crypto.randomUUID() })).rejects.toThrow("already in progress");
  });

  it("marks abandoned running work failed and allows an explicit new version", async () => {
    const project = await createProject(db, alice, { title: "Alpha" });
    const first = await createGeneration(db, alice, project.id, { prompt: "A paper bird", steps: 4, clientRequestId: crypto.randomUUID() });
    await db.execute(sql`update image_generations set status = 'running', started_at = now() - interval '5 minutes' where id = ${first!.id}`);
    await recoverStaleGenerations(db);
    expect((await getGeneration(db, alice, project.id, first!.id))?.status).toBe("failed");
    expect((await getGeneration(db, alice, project.id, first!.id))?.failureCode).toBe("interrupted");
    const second = await createGeneration(db, alice, project.id, { prompt: first!.prompt, steps: first!.steps, clientRequestId: crypto.randomUUID() });
    expect(second?.id).not.toBe(first?.id);
    await failGeneration(db, second!.id, "provider_timeout");
    expect((await getGeneration(db, alice, project.id, second!.id))?.status).toBe("failed");
  });
});
