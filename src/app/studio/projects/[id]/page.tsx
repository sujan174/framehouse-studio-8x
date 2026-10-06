import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { getProject } from "@/server/projects/repository";
import { ProjectEditor } from "@/components/project-editor";
import { ImageWorkspace } from "@/components/image-workspace";
import { countDailyGenerationUsage, listGenerations } from "@/server/generations/repository";
import { generationView } from "@/server/generations/view";
import { WorkspaceBoundary } from "@/components/workspace-boundary";
import { getCreativeState } from "@/server/creative/repository";
import { getPublication } from "@/server/creative/publication";
import { listReferences } from "@/server/generations/references";
export const metadata: Metadata = { title: "Project" };
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await currentTenant();
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const project = await getProject(db, tenant, parsed.data);
  if (!project) notFound();
  const [generations, dailyUsed, creativeState, publication, references] = await Promise.all([
    listGenerations(db, tenant, project.id),
    countDailyGenerationUsage(db, tenant),
    getCreativeState(db, tenant, project.id),
    getPublication(db, tenant, project.id),
    listReferences(db, tenant, project.id),
  ]);
  return (
    <main className="studio-main">
      <Link href="/studio" className="back-link">
        <ChevronLeft size={17} /> All projects
      </Link>
      <WorkspaceBoundary serverOrgId={tenant.orgId}>
        <header className="project-studio-header"><div><p className="eyebrow">PROJECT / WORKSPACE</p><h1>{project.title}</h1><p>{project.description || "A space for ideas worth making."}</p></div><span className="project-state">ACTIVE PROJECT</span></header>
        <ImageWorkspace projectId={project.id} serverOrgId={tenant.orgId}
          initialGenerations={(generations ?? []).map(generationView)}
          initialCreativeState={creativeState!} projectTitle={project.title}
          initialPublication={publication!}
          initialReferences={(references ?? []).map((item) => ({ id: item.id, createdAt: item.createdAt.toISOString() }))}
          initialDailyUsed={dailyUsed}
          available={Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN)} />
        <details className="project-settings-panel"><summary>Project settings <span>Edit details and archive</span></summary>
          <ProjectEditor initialProject={project} serverOrgId={tenant.orgId}
            canArchive={project.creatorUserId === tenant.userId || tenant.role === "org:admin"} />
        </details>
      </WorkspaceBoundary>
    </main>
  );
}
