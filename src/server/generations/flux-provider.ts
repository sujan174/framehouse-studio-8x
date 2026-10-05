import type { GenerationFailure } from "./repository";

export class ProviderError extends Error {
  constructor(public readonly code: GenerationFailure, public readonly httpStatus?: number, public readonly providerCode?: number, public readonly schemaHints?: string[]) {
    super(code);
  }
}

type FluxInput = { prompt: string; steps: number };
type Credentials = { accountId: string; token: string };
const MAX_RESPONSE_BYTES = 8_000_000;

export async function generateFluxImage(
  input: FluxInput,
  credentials: Credentials,
  fetcher: typeof fetch = fetch,
): Promise<Buffer> {
  if (!/^[a-f0-9]{32}$/i.test(credentials.accountId) || !credentials.token)
    throw new ProviderError("configuration");
  let response: Response;
  try {
    response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      },
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
      throw new ProviderError("provider_timeout");
    throw new ProviderError("provider_unavailable");
  }
  let payload: unknown;
  try {
    if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES)
      throw new ProviderError("invalid_output");
    if (!response.body) throw new ProviderError("invalid_output");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) throw new ProviderError("invalid_output");
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    payload = JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size).toString("utf8"));
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
      throw new ProviderError("provider_timeout");
    throw new ProviderError("invalid_output");
  }
  if (!response.ok) {
    const errors = typeof payload === "object" && payload !== null && "errors" in payload
      ? payload.errors : null;
    const codes = Array.isArray(errors) ? errors.map((item: unknown) =>
      typeof item === "object" && item !== null && "code" in item ? item.code : null) : [];
    const numericCode = codes.find((code): code is number => typeof code === "number");
    const messages = Array.isArray(errors) ? errors.map((item: unknown) =>
      typeof item === "object" && item !== null && "message" in item && typeof item.message === "string" ? item.message.toLowerCase() : "") : [];
    const schemaHints = ["prompt", "steps", "seed", "required", "additional", "type", "range", "multipart"].filter((hint) =>
      messages.some((message) => message.includes(hint)));
    if (response.status === 429 && codes.includes(3036)) throw new ProviderError("provider_quota", response.status, numericCode);
    if (response.status === 401 || response.status === 403) throw new ProviderError("configuration", response.status, numericCode);
    throw new ProviderError("provider_unavailable", response.status, numericCode, schemaHints);
  }
  if (typeof payload !== "object" || payload === null || !("result" in payload) ||
      !("success" in payload) || payload.success !== true)
    throw new ProviderError("invalid_output");
  const result = payload.result;
  if (typeof result !== "object" || result === null || !("image" in result) || typeof result.image !== "string")
    throw new ProviderError("invalid_output");
  const encoded = result.image;
  if (encoded.length > MAX_RESPONSE_BYTES || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new ProviderError("invalid_output");
  const image = Buffer.from(encoded, "base64");
  if (image.length < 4 || image.length > 6_000_000 || image[0] !== 0xff || image[1] !== 0xd8 ||
      image[image.length - 2] !== 0xff || image[image.length - 1] !== 0xd9)
    throw new ProviderError("invalid_output");
  return image;
}
