import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { generateFluxRemix } from "../src/server/generations/flux2-provider";
import { ProviderError } from "../src/server/generations/flux-provider";

const credentials = { accountId: "a".repeat(32), token: "test-token" };
async function reference() { return sharp({ create: { width: 900, height: 700, channels: 3, background: "#2457ab" } }).jpeg().toBuffer(); }
describe("FLUX.2 reference provider", () => {
  it("sends a bounded multipart reference and normalizes a real image result", async () => {
    const output = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#e29455" } }).png().toBuffer();
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      expect(options.headers).toEqual({ Authorization: "Bearer test-token" });
      const form = options.body as FormData;
      expect(form.get("prompt")).toBe("Make it golden");
      expect(form.get("steps")).toBeNull();
      const file = form.get("input_image_0") as File;
      expect(file.type).toBe("image/jpeg");
      const info = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
      expect(info.width).toBeLessThan(512);
      expect(info.height).toBeLessThan(512);
      return Response.json({ success: true, result: { image: output.toString("base64") } });
    });
    const image = await generateFluxRemix({ prompt: "Make it golden", reference: await reference() }, credentials, fetcher as typeof fetch);
    expect((await sharp(image).metadata()).format).toBe("jpeg");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("maps quota and bad output to terminal errors", async () => {
    await expect(generateFluxRemix({ prompt: "Edit", reference: await reference() }, credentials,
      (async () => Response.json({ success: false, errors: [{ code: 3036 }] }, { status: 429 })) as typeof fetch))
      .rejects.toMatchObject({ code: "provider_quota" } satisfies Partial<ProviderError>);
    await expect(generateFluxRemix({ prompt: "Edit", reference: await reference() }, credentials,
      (async () => Response.json({ success: true, result: { image: "not-image" } })) as typeof fetch))
      .rejects.toMatchObject({ code: "invalid_output" } satisfies Partial<ProviderError>);
  });
});
