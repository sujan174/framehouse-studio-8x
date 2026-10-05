import { describe, expect, it } from "vitest";
import { generateFluxImage, ProviderError } from "../src/server/generations/flux-provider";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const input = { prompt: "A silver kite over a quiet sea", steps: 4 };
const credentials = { accountId: "a".repeat(32), token: "test-token" };

describe("FLUX provider response", () => {
  it("sends only supported settings and returns a real JPEG response", async () => {
    let seenBody: unknown;
    const fetcher: typeof fetch = async (_url, init) => {
      seenBody = JSON.parse(String(init?.body));
      return Response.json({ success: true, result: { image: jpeg.toString("base64") } });
    };
    const rowLikeInput = { ...input, extraInternalField: "never send" };
    expect(await generateFluxImage(rowLikeInput, credentials, fetcher)).toEqual(jpeg);
    expect(seenBody).toEqual(input);
  });

  it("distinguishes daily quota from temporary capacity errors", async () => {
    const quota: typeof fetch = async () => Response.json({ success: false, errors: [{ code: 3036 }] }, { status: 429 });
    const capacity: typeof fetch = async () => Response.json({ success: false, errors: [{ code: 3040 }] }, { status: 429 });
    await expect(generateFluxImage(input, credentials, quota)).rejects.toMatchObject({ code: "provider_quota" });
    await expect(generateFluxImage(input, credentials, capacity)).rejects.toMatchObject({ code: "provider_unavailable" });
    const denied: typeof fetch = async () => Response.json({ success: false, errors: [{ code: 5035 }] }, { status: 403 });
    await expect(generateFluxImage(input, credentials, denied)).rejects.toMatchObject({ code: "configuration" });
  });

  it("rejects malformed bytes and reports a timeout without exposing credentials", async () => {
    const malformed: typeof fetch = async () => Response.json({ success: true, result: { image: Buffer.from("not an image").toString("base64") } });
    await expect(generateFluxImage(input, credentials, malformed)).rejects.toMatchObject({ code: "invalid_output" });
    const falseSuccess: typeof fetch = async () => Response.json({ success: false, result: { image: jpeg.toString("base64") } });
    await expect(generateFluxImage(input, credentials, falseSuccess)).rejects.toMatchObject({ code: "invalid_output" });
    const timeout: typeof fetch = async () => { throw new DOMException("aborted", "AbortError"); };
    await expect(generateFluxImage(input, credentials, timeout)).rejects.toMatchObject({ code: "provider_timeout" });
    expect(new ProviderError("provider_timeout").message).not.toContain(credentials.token);
  });

  it("stops reading when a response exceeds the limit without Content-Length", async () => {
    let canceled = false;
    const oversized: typeof fetch = async () => new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(1_000_000)); },
      cancel() { canceled = true; },
    }));
    await expect(generateFluxImage(input, credentials, oversized)).rejects.toMatchObject({ code: "invalid_output" });
    expect(canceled).toBe(true);
  });
});
