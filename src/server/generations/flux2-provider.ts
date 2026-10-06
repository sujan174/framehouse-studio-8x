import sharp from "sharp";
import { ProviderError } from "./flux-provider";

type Credentials = { accountId: string; token: string };
const MAX_RESPONSE_BYTES = 12_000_000;

export async function generateFluxRemix(input: { prompt: string; reference: Buffer }, credentials: Credentials,
  fetcher: typeof fetch = fetch): Promise<Buffer> {
  if (!/^[a-f0-9]{32}$/i.test(credentials.accountId) || !credentials.token) throw new ProviderError("configuration");
  let reference: Buffer;
  try {
    reference = await sharp(input.reference, { limitInputPixels: 16_000_000, failOn: "error" })
      .rotate().resize(500, 500, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const info = await sharp(reference).metadata();
    if (!info.width || !info.height || info.width >= 512 || info.height >= 512) throw new Error();
  } catch { throw new ProviderError("invalid_output"); }
  const form = new FormData();
  form.set("prompt", input.prompt);
  form.set("input_image_0", new Blob([new Uint8Array(reference)], { type: "image/jpeg" }), "reference.jpg");
  form.set("width", "768");
  form.set("height", "768");
  let response: Response;
  try {
    response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`, {
      method: "POST", headers: { Authorization: `Bearer ${credentials.token}` }, body: form,
      signal: AbortSignal.timeout(45_000), cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new ProviderError("provider_timeout");
    throw new ProviderError("provider_unavailable");
  }
  let payload: unknown;
  try {
    if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES || !response.body) throw new Error();
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) throw new Error();
        chunks.push(Buffer.from(value));
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    finally { reader.releaseLock(); }
    payload = JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new ProviderError("provider_timeout");
    throw new ProviderError("invalid_output");
  }
  if (!response.ok) {
    const codes = typeof payload === "object" && payload && "errors" in payload && Array.isArray(payload.errors)
      ? payload.errors.map((value: unknown) => typeof value === "object" && value && "code" in value ? value.code : null) : [];
    if (response.status === 429) throw new ProviderError("provider_quota", response.status);
    if (response.status === 401 || response.status === 403) throw new ProviderError("configuration", response.status);
    throw new ProviderError("provider_unavailable", response.status, codes.find((value): value is number => typeof value === "number"));
  }
  if (typeof payload !== "object" || !payload || !("success" in payload) || payload.success !== true ||
      !("result" in payload) || typeof payload.result !== "object" || !payload.result ||
      !("image" in payload.result) || typeof payload.result.image !== "string" ||
      payload.result.image.length > MAX_RESPONSE_BYTES || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.result.image))
    throw new ProviderError("invalid_output");
  try {
    const bytes = Buffer.from(payload.result.image, "base64");
    if (bytes.length < 4 || bytes.length > 8_000_000) throw new Error();
    const image = await sharp(bytes, { limitInputPixels: 16_000_000, failOn: "error" }).rotate()
      .jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    if (image.length > 6_000_000) throw new Error();
    return image;
  } catch { throw new ProviderError("invalid_output"); }
}
