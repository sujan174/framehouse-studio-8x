import { AuthorizationError } from "./tenant";

export function verifyMutationRequest(request: Request, activeOrgId: string) {
  const origin = request.headers.get("origin");
  const configuredOrigin = process.env.APP_ORIGIN;
  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin ?? "").origin;
  } catch {
    throw new AuthorizationError();
  }
  if (!configuredOrigin || !origin || requestOrigin !== configuredOrigin)
    throw new AuthorizationError();
  if (request.headers.get("x-workspace-id") !== activeOrgId)
    throw new AuthorizationError();
}

export async function readSmallJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new SyntaxError();
  const length = request.headers.get("content-length");
  if (length && Number(length) > 4096) throw new SyntaxError();
  if (!request.body) throw new SyntaxError();
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) throw new SyntaxError();
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch {
    await reader.cancel().catch(() => {});
    throw new SyntaxError();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(body) as unknown;
}
