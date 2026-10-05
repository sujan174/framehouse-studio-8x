import { generateFluxImage, ProviderError } from "../src/server/generations/flux-provider";

async function main() {
  const image = await generateFluxImage(
    { prompt: "A single red paper kite above a calm sea at dawn, soft natural light", steps: 4 },
    {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
      token: process.env.CLOUDFLARE_API_TOKEN ?? "",
    },
  );
  console.log(JSON.stringify({ model: "flux-1-schnell", format: "jpeg", bytes: image.length, result: "verified" }));
}

void main().catch((error: unknown) => {
  const details = error instanceof ProviderError
    ? { code: error.code, status: error.httpStatus ?? null, providerCode: error.providerCode ?? null, schemaHints: error.schemaHints ?? [] }
    : { code: "unexpected" };
  console.error(JSON.stringify({ result: "failed", ...details }));
  process.exitCode = 1;
});
