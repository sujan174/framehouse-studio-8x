import { OrganizationList } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function WorkspacesPage() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  if (session.orgId) redirect("/studio");
  return (
    <main className="workspace-entry">
      <Link href="/" className="wordmark">
        <span className="mark">F.</span> FRAMEHOUSE <small>STUDIO</small>
      </Link>
      <div className="workspace-entry-inner">
        <p className="eyebrow">YOUR SPACE TO MAKE</p>
        <h1>Choose a workspace</h1>
        <p>
          Select a team or create a new workspace to begin. Projects belong to
          the workspace you choose.
        </p>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/studio"
          afterSelectOrganizationUrl="/studio"
        />
      </div>
    </main>
  );
}
