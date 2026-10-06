import type { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ImageGeneration } from "../db/schema";
import {
  claimNextGeneration,
  failGeneration,
  finishGeneration,
  getJobReference,
  recoverStaleGenerations,
  type GenerationFailure,
} from "./repository";
import { generateFluxImage, ProviderError } from "./flux-provider";
import { generateFluxRemix } from "./flux2-provider";

type Database = NodePgDatabase<Record<string, never>>;
type Generator = (input: ImageGeneration, reference: Buffer | null) => Promise<Buffer>;

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
      const reference = await getJobReference(db, job);
      if (job.model === "flux-2-klein-4b" && !reference) throw new ProviderError("invalid_output");
      const image = await generate(job, reference);
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
  const generate: Generator = (input, reference) => {
    const credentials = { accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "", token: process.env.CLOUDFLARE_API_TOKEN ?? "" };
    if (input.model === "flux-2-klein-4b" && reference) return generateFluxRemix({ prompt: input.prompt, reference }, credentials);
    if (input.model === "flux-1-schnell") return generateFluxImage({ prompt: input.prompt, steps: input.steps }, credentials);
    throw new ProviderError("invalid_output");
  };
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
