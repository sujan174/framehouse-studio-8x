import type { ImageGeneration } from "../db/schema";

export function generationView(generation: ImageGeneration) {
  return {
    id: generation.id,
    prompt: generation.prompt,
    steps: generation.steps,
    model: generation.model,
    referenceGenerationId: generation.referenceGenerationId,
    referenceUploadId: generation.referenceUploadId,
    status: generation.status,
    failureCode: generation.failureCode,
    createdAt: generation.createdAt.toISOString(),
    completedAt: generation.completedAt?.toISOString() ?? null,
  };
}
export type GenerationView = ReturnType<typeof generationView>;
