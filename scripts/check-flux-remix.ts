import sharp from "sharp";
import { generateFluxRemix } from "../src/server/generations/flux2-provider";
import { ProviderError } from "../src/server/generations/flux-provider";

async function main() {
  const reference = await sharp({ create: { width: 256, height: 256, channels: 3,
    background: { r: 30, g: 80, b: 150 } } }).jpeg().toBuffer();
  const image = await generateFluxRemix({ prompt: "Turn the flat blue reference into a warm orange sunset gradient, keeping its simple composition", reference },
    { accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "", token: process.env.CLOUDFLARE_API_TOKEN ?? "" });
  const info = await sharp(image).metadata();
  console.log(JSON.stringify({ model: "flux-2-klein-4b", reference: true, format: info.format,
    width: info.width, height: info.height, bytes: image.length, result: "verified" }));
}
void main().catch((error: unknown) => {
  const details = error instanceof ProviderError ? { code: error.code, status: error.httpStatus ?? null } : { code: "unexpected" };
  console.error(JSON.stringify({ result: "failed", ...details }));
  process.exitCode = 1;
});
