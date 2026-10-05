import type { Metadata } from "next";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { listProjectCovers, listProjects } from "@/server/projects/repository";
import { ProjectList } from "@/components/project-list";
export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";
export default async function StudioPage() {
  const tenant = await currentTenant();
  const [projects, covers] = await Promise.all([listProjects(db, tenant), listProjectCovers(db, tenant)]);
  return (
    <main className="studio-main">
      <header className="studio-page-header">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Projects</h1>
          <p>Where your next idea takes shape.</p>
        </div>
      </header>
      <ProjectList initialProjects={projects} initialCovers={covers} serverOrgId={tenant.orgId} />
    </main>
  );
}
