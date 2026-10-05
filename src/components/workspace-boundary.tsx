"use client";

import { useAuth } from "@clerk/nextjs";

export function WorkspaceBoundary({ serverOrgId, children }: {
  serverOrgId: string;
  children: React.ReactNode;
}) {
  const { orgId, isLoaded } = useAuth();
  if (!isLoaded || orgId !== serverOrgId)
    return <div className="empty-state"><h2>Switching workspace…</h2><p>Loading the right project for your workspace.</p></div>;
  return <>{children}</>;
}
