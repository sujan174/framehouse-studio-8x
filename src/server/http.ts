import "server-only";
import { ZodError } from "zod";
import {
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  WorkspaceError,
} from "./tenant";
import { GenerationBusyError, GenerationLimitError, SubmissionConflictError, UnavailableReferenceError } from "./generations/repository";
import { InvalidCreativeImageError, StaleCreativeStateError } from "./creative/repository";
import { EmptyStoryError, PublicationForbiddenError } from "./creative/publication";
import { InvalidReferenceError, ReferenceLimitError } from "./generations/references";
export { readLimitedBytes, readSmallJson, verifyMutationRequest } from "./request-policy";
export function errorResponse(error: unknown) {
  const headers = { "Cache-Control": "private, no-store" };
  if (error instanceof AuthenticationError)
    return Response.json({ error: "Sign in required" }, { status: 401, headers });
  if (error instanceof WorkspaceError)
    return Response.json({ error: "Choose a workspace" }, { status: 403, headers });
  if (error instanceof AuthorizationError)
    return Response.json({ error: "Not authorized" }, { status: 403, headers });
  if (error instanceof PublicationForbiddenError)
    return Response.json({ error: "Only the project owner or a workspace admin can publish this story." }, { status: 403, headers });
  if (error instanceof EmptyStoryError)
    return Response.json({ error: "Add at least one available image to the storyboard first." }, { status: 400, headers });
  if (error instanceof InvalidReferenceError)
    return Response.json({ error: "Use a valid JPEG, PNG, or WebP image between 64 and 6000 pixels per side, up to 5 MB." }, { status: 400, headers });
  if (error instanceof UnavailableReferenceError)
    return Response.json({ error: "Choose a reference from this project." }, { status: 400, headers });
  if (error instanceof ReferenceLimitError)
    return Response.json({ error: "This project has reached its 12 reference image limit." }, { status: 429, headers });
  if (error instanceof GenerationBusyError)
    return Response.json({ error: "Finish the current image before starting another." }, { status: 409, headers });
  if (error instanceof SubmissionConflictError)
    return Response.json({ error: "This submission was already used for different settings." }, { status: 409, headers });
  if (error instanceof StaleCreativeStateError)
    return Response.json({ error: "This board changed elsewhere. Reload to see the latest version." }, { status: 409, headers });
  if (error instanceof InvalidCreativeImageError)
    return Response.json({ error: "Select successful images from this project." }, { status: 400, headers });
  if (error instanceof GenerationLimitError)
    return Response.json({ error: "Daily image limit reached. Try again after 00:00 UTC." }, { status: 429, headers });
  if (error instanceof RateLimitError)
    return Response.json(
      { error: "Usage limit reached. Try again later." },
      { status: 429, headers },
    );
  if (error instanceof ZodError || error instanceof SyntaxError)
    return Response.json({ error: "Invalid input" }, { status: 400, headers });
  console.error("Request failed", {
    kind: error instanceof Error ? error.name : "Unknown",
  });
  return Response.json(
    { error: "The request could not be completed" },
    { status: 500, headers },
  );
}
