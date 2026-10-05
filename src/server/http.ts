import "server-only";
import { ZodError } from "zod";
import {
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  WorkspaceError,
} from "./tenant";
export function errorResponse(error: unknown) {
  if (error instanceof AuthenticationError)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  if (error instanceof WorkspaceError)
    return Response.json({ error: "Choose a workspace" }, { status: 403 });
  if (error instanceof AuthorizationError)
    return Response.json({ error: "Not authorized" }, { status: 403 });
  if (error instanceof RateLimitError)
    return Response.json(
      { error: "Project creation limit reached. Try again later." },
      { status: 429 },
    );
  if (error instanceof ZodError || error instanceof SyntaxError)
    return Response.json({ error: "Invalid project input" }, { status: 400 });
  console.error("Request failed", {
    kind: error instanceof Error ? error.name : "Unknown",
  });
  return Response.json(
    { error: "The request could not be completed" },
    { status: 500 },
  );
}
export function verifyMutationRequest(request: Request, activeOrgId: string) {
  const origin = request.headers.get("origin");
  let originHost: string;
  try {
    originHost = new URL(origin ?? "").host;
  } catch {
    throw new AuthorizationError();
  }
  if (!origin || originHost !== new URL(request.url).host)
    throw new AuthorizationError();
  if (request.headers.get("x-workspace-id") !== activeOrgId)
    throw new AuthorizationError();
}
export async function readSmallJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new SyntaxError();
  const body = await request.text();
  if (body.length > 4096) throw new SyntaxError();
  return JSON.parse(body) as unknown;
}
