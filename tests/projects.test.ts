import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import {
  createProject,
  getProject,
  listProjects,
  countProjects,
  updateProject,
  archiveProject,
} from "../src/server/projects/repository";
import { requireTenant, type TenantContext } from "../src/server/tenant";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "TEST_DATABASE_URL is required; run against isolated PostgreSQL",
  );
const pool = new Pool({ connectionString: url });
const db = drizzle(pool);
const alice: TenantContext = {
  userId: "user_alice",
  orgId: "org_a",
  role: "org:member",
};
const bob: TenantContext = {
  userId: "user_bob",
  orgId: "org_b",
  role: "org:member",
};
const teammate: TenantContext = {
  userId: "user_teammate",
  orgId: "org_a",
  role: "org:member",
};
const admin: TenantContext = {
  userId: "user_admin",
  orgId: "org_a",
  role: "org:admin",
};

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});
beforeEach(async () => {
  await db.execute(sql`truncate table projects cascade`);
});
afterAll(async () => {
  await pool.end();
});

describe("verified tenant boundary", () => {
  it("rejects absent sessions and absent organizations", () => {
    expect(() =>
      requireTenant({ userId: null, orgId: null, orgRole: null }),
    ).toThrow();
    expect(() =>
      requireTenant({ userId: "user_alice", orgId: null, orgRole: null }),
    ).toThrow();
  });
  it("scopes list, count, detail, update and archive by organization", async () => {
    const a = await createProject(db, alice, {
      title: "Alpha",
      description: "Private A",
    });
    const b = await createProject(db, bob, {
      title: "Beta",
      description: "Private B",
    });
    expect((await listProjects(db, alice)).map((x) => x.id)).toEqual([a.id]);
    expect(await countProjects(db, alice)).toBe(1);
    expect(await getProject(db, alice, b.id)).toBeNull();
    expect(
      await updateProject(db, alice, b.id, { title: "Stolen" }),
    ).toBeNull();
    expect(await archiveProject(db, alice, b.id)).toBeNull();
    expect((await getProject(db, bob, b.id))?.title).toBe("Beta");
  });
  it("rejects forged organization and creator fields", async () => {
    await expect(
      createProject(db, alice, { title: "Forged", orgId: "org_b" }),
    ).rejects.toThrow();
    const p = await createProject(db, alice, { title: "Safe" });
    await expect(
      updateProject(db, alice, p.id, { clerkOrgId: "org_b" }),
    ).rejects.toThrow();
    expect((await getProject(db, alice, p.id))?.clerkOrgId).toBe("org_a");
  });
  it("only creator or admin may archive, and archived items disappear from active reads", async () => {
    const p = await createProject(db, alice, { title: "Shared" });
    await expect(archiveProject(db, teammate, p.id)).rejects.toThrow();
    expect(await archiveProject(db, admin, p.id)).not.toBeNull();
    expect(await getProject(db, alice, p.id)).toBeNull();
    expect(await countProjects(db, alice)).toBe(0);
  });
  it("persists edits and rejects empty or overlong titles", async () => {
    const p = await createProject(db, alice, { title: "Draft" });
    await updateProject(db, alice, p.id, {
      title: "Revised",
      description: "A concise brief",
    });
    expect((await getProject(db, alice, p.id))?.description).toBe(
      "A concise brief",
    );
    await expect(createProject(db, alice, { title: "" })).rejects.toThrow();
    await expect(
      updateProject(db, alice, p.id, { title: "x".repeat(121) }),
    ).rejects.toThrow();
  });
  it("limits repeated creation per verified user and organization in Postgres", async () => {
    for (let i = 0; i < 20; i++)
      await createProject(db, alice, { title: `Draft ${i}` });
    await expect(
      createProject(db, alice, { title: "One too many" }),
    ).rejects.toThrow("Project creation limit reached");
    await expect(
      createProject(db, teammate, { title: "Independent member" }),
    ).resolves.toMatchObject({ title: "Independent member" });
  });
});
