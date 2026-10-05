import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { currentTenant } from "@/server/auth";
import { db } from "@/server/db/client";
import { getProject } from "@/server/projects/repository";
import { ProjectEditor } from "@/components/project-editor";
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
  return (
    <main className="studio-main">
      <Link href="/studio" className="back-link">
        <ChevronLeft size={17} /> All projects
      </Link>
      <ProjectEditor
        initialProject={project}
        serverOrgId={tenant.orgId}
        canArchive={
          project.creatorUserId === tenant.userId || tenant.role === "org:admin"
        }
      />
    </main>
  );
}
