export type TenantContext = Readonly<{
  userId: string;
  orgId: string;
  role: string;
}>;
export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required");
  }
}
export class WorkspaceError extends Error {
  constructor() {
    super("Active workspace required");
  }
}
export class AuthorizationError extends Error {
  constructor() {
    super("Not authorized");
  }
}
export class RateLimitError extends Error {
  constructor() {
    super("Project creation limit reached");
  }
}
export function requireTenant(session: {
  userId: string | null;
  orgId: string | null;
  orgRole: string | null;
}): TenantContext {
  if (!session.userId) throw new AuthenticationError();
  if (!session.orgId || !session.orgRole) throw new WorkspaceError();
  return {
    userId: session.userId,
    orgId: session.orgId,
    role: session.orgRole,
  };
}
