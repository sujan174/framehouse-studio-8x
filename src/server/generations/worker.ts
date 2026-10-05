import type { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ImageGeneration } from "../db/schema";
import {
  claimNextGeneration,
  failGeneration,
  finishGeneration,
  recoverStaleGenerations,
  type GenerationFailure,
} from "./repository";
import { generateFluxImage, ProviderError } from "./flux-provider";

type Database = NodePgDatabase<Record<string, never>>;
type Generator = (input: Pick<ImageGeneration, "prompt" | "steps">) => Promise<Buffer>;

export async function runOneGeneration(db: Database, pool: Pool, generate: Generator) {
  const client = await pool.connect();
  let locked = false;
  try {
    const result = await client.query<{ acquired: boolean }>("select pg_try_advisory_lock(481153, 2) as acquired");
    locked = result.rows[0]?.acquired ?? false;
    if (!locked) return null;
    await recoverStaleGenerations(db);
    const job = await claimNextGeneration(db);
    if (!job) return null;
    try {
      const image = await generate(job);
      await finishGeneration(db, job.id, image);
    } catch (error) {
      const code: GenerationFailure = error instanceof ProviderError ? error.code : "provider_unavailable";
      await failGeneration(db, job.id, code);
      console.error("Image generation failed", { generationId: job.id, code });
    }
    return job.id;
  } finally {
    try {
      if (locked) await client.query("select pg_advisory_unlock(481153, 2)");
    } finally {
      client.release();
    }
  }
}

export function startGenerationWorker(db: Database, pool: Pool) {
  const generate: Generator = (input) => generateFluxImage(input, {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    token: process.env.CLOUDFLARE_API_TOKEN ?? "",
  });
  let working = false;
  const tick = async () => {
    if (working) return;
    working = true;
    try {
      await runOneGeneration(db, pool, generate);
    } catch (error) {
      console.error("Image worker iteration failed", { kind: error instanceof Error ? error.name : "Unknown" });
    } finally {
      working = false;
    }
  };
  const timer = setInterval(() => { void tick(); }, 3_000);
  timer.unref();
  void tick();
}
