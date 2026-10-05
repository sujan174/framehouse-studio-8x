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
  claimNextGeneration,
  countDailyGenerationUsage,
} from "../src/server/generations/repository";
import { runOneGeneration } from "../src/server/generations/worker";
import { ProviderError } from "../src/server/generations/flux-provider";

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
    expect(await getGenerationImage(db, alice, a.id, generation!.id)).toBeNull();
    expect(await listGenerations(db, bob, a.id)).toBeNull();
    expect(await getGeneration(db, bob, b.id, generation!.id)).toBeNull();
    expect(await getGenerationImage(db, bob, b.id, generation!.id)).toBeNull();
    await claimNextGeneration(db);
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
    await expect(createGeneration(db, alice, project.id, { ...base, steps: 5 })).rejects.toThrow();
    await expect(createGeneration(db, alice, project.id, { ...base, prompt: " " })).rejects.toThrow();
  });

  it("does not enqueue work for an archived project", async () => {
    const project = await createProject(db, alice, { title: "Archived" });
    const queued = await createGeneration(db, alice, project.id, {
      prompt: "A private skyline", steps: 4, clientRequestId: crypto.randomUUID(),
    });
    await archiveProject(db, alice, project.id);
    expect(await claimNextGeneration(db)).toBeNull();
    const canceled = await db.execute(sql`select status, failure_code from image_generations where id = ${queued!.id}`);
    expect(canceled.rows[0]).toMatchObject({ status: "failed", failure_code: "project_archived" });
    expect(await createGeneration(db, alice, project.id, {
      prompt: "A private skyline", steps: 4, clientRequestId: crypto.randomUUID(),
    })).toBeNull();
  });

  it("does not persist a running image after its project is archived", async () => {
    const project = await createProject(db, alice, { title: "Archived during provider call" });
    const generation = await createGeneration(db, alice, project.id, {
      prompt: "A private skyline", steps: 4, clientRequestId: crypto.randomUUID(),
    });
    expect((await claimNextGeneration(db))?.id).toBe(generation!.id);
    await archiveProject(db, alice, project.id);
    expect(await finishGeneration(db, generation!.id, Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    const row = await db.execute(sql`select status, failure_code from image_generations where id = ${generation!.id}`);
    expect(row.rows[0]).toMatchObject({ status: "failed", failure_code: "project_archived" });
    const stored = await db.execute(sql`select count(*)::int as total from generation_images where generation_id = ${generation!.id}`);
    expect(stored.rows[0].total).toBe(0);
    expect(await getGenerationImage(db, alice, project.id, generation!.id)).toBeNull();
  });

  it("denies details and private bytes of an archived successful generation", async () => {
    const project = await createProject(db, alice, { title: "Private archive" });
    const generation = await createGeneration(db, alice, project.id, {
      prompt: "An amber room", steps: 4, clientRequestId: crypto.randomUUID(),
    });
    await claimNextGeneration(db);
    await finishGeneration(db, generation!.id, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    await archiveProject(db, alice, project.id);
    expect(await listGenerations(db, alice, project.id)).toBeNull();
    expect(await getGeneration(db, alice, project.id, generation!.id)).toBeNull();
    expect(await getGenerationImage(db, alice, project.id, generation!.id)).toBeNull();
    expect(await getGenerationImage(db, bob, project.id, generation!.id)).toBeNull();
  });

  it("does not complete an unclaimed queued generation", async () => {
    const project = await createProject(db, alice, { title: "Queue" });
    const generation = await createGeneration(db, alice, project.id, {
      prompt: "A folded paper star", steps: 4, clientRequestId: crypto.randomUUID(),
    });
    expect(await finishGeneration(db, generation!.id, Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect((await getGeneration(db, alice, project.id, generation!.id))?.status).toBe("queued");
  });

  it("deduplicates a repeated submission key and bounds outstanding work", async () => {
    const project = await createProject(db, alice, { title: "Alpha" });
    const input = { prompt: "Red dunes at dusk", steps: 4, clientRequestId: crypto.randomUUID() };
    const first = await createGeneration(db, alice, project.id, input);
    const again = await createGeneration(db, alice, project.id, input);
    expect(again?.id).toBe(first?.id);
    await expect(createGeneration(db, alice, project.id, { ...input, prompt: "Changed prompt" })).rejects.toThrow("different input");
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

  it("claims queued work once across concurrent workers", async () => {
    const project = await createProject(db, alice, { title: "Alpha" });
    const queued = await createGeneration(db, alice, project.id, {
      prompt: "A sunlit hillside", steps: 4, clientRequestId: crypto.randomUUID(),
    });
    const claims = await Promise.all([claimNextGeneration(db), claimNextGeneration(db)]);
    expect(claims.filter(Boolean).map((x) => x?.id)).toEqual([queued!.id]);
    expect((await getGeneration(db, alice, project.id, queued!.id))?.status).toBe("running");
  });

  it("persists provider success and quota failure as terminal states", async () => {
    const project = await createProject(db, alice, { title: "Alpha" });
    const first = await createGeneration(db, alice, project.id, {
      prompt: "A mossy courtyard", steps: 4, clientRequestId: crypto.randomUUID(),
    });
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    await runOneGeneration(db, pool, async (input) => {
      expect(input).toEqual({ prompt: "A mossy courtyard", steps: 4 });
      return jpeg;
    });
    expect((await getGeneration(db, alice, project.id, first!.id))?.status).toBe("succeeded");
    expect(await getGenerationImage(db, alice, project.id, first!.id)).toEqual(jpeg);
    const second = await createGeneration(db, alice, project.id, {
      prompt: "A mossy courtyard", steps: 4, clientRequestId: crypto.randomUUID(),
    });
    await runOneGeneration(db, pool, async () => { throw new ProviderError("provider_quota"); });
    expect((await getGeneration(db, alice, project.id, second!.id))?.failureCode).toBe("provider_quota");
  });

  it("caps one member to five submissions per UTC day, including failed attempts", async () => {
    const project = await createProject(db, alice, { title: "Alpha" });
    for (let index = 0; index < 5; index++) {
      const generation = await createGeneration(db, alice, project.id, {
        prompt: `Version ${index}`, steps: 4, clientRequestId: crypto.randomUUID(),
      });
      await failGeneration(db, generation!.id, "provider_unavailable");
    }
    expect(await countDailyGenerationUsage(db, alice)).toBe(5);
    expect(await countDailyGenerationUsage(db, bob)).toBe(0);
    await expect(createGeneration(db, alice, project.id, {
      prompt: "One too many", steps: 4, clientRequestId: crypto.randomUUID(),
    })).rejects.toThrow("Daily image limit reached");
  });

  it("holds one provider call globally while another request waits", async () => {
    const a = await createProject(db, alice, { title: "Alpha" });
    const b = await createProject(db, bob, { title: "Beta" });
    await createGeneration(db, alice, a.id, { prompt: "Alpha image", steps: 4, clientRequestId: crypto.randomUUID() });
    await createGeneration(db, bob, b.id, { prompt: "Beta image", steps: 4, clientRequestId: crypto.randomUUID() });
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => { started = resolve; });
    const held = new Promise<void>((resolve) => { release = resolve; });
    const first = runOneGeneration(db, pool, async () => { started(); await held; return Buffer.from([0xff, 0xd8, 0xff, 0xd9]); });
    await entered;
    expect(await runOneGeneration(db, pool, async () => { throw new Error("should not run concurrently"); })).toBeNull();
    release();
    await first;
  });
});
