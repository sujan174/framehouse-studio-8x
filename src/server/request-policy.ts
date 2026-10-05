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
