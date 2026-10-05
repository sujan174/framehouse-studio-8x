import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban, Settings2 } from "lucide-react";
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  if (!session.orgId) redirect("/workspaces");
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <Link href="/studio" className="wordmark">
          <span className="mark">F.</span> FRAMEHOUSE <small>STUDIO</small>
        </Link>
        <div className="sidebar-section">
          <span className="sidebar-label">WORKSPACE</span>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/studio"
            afterSelectOrganizationUrl="/studio"
          />
        </div>
        <nav className="studio-nav" aria-label="Studio navigation">
          <Link href="/studio">
            <FolderKanban size={19} /> Projects
          </Link>
          <Link href="/studio/settings">
            <Settings2 size={19} /> Settings
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-label">ACCOUNT</span>
          <UserButton showName />
        </div>
      </aside>
      <div className="studio-content" key={session.orgId}>
        <div className="mobile-studio-head">
          <Link href="/studio" className="wordmark">
            <span className="mark">F.</span> FRAMEHOUSE
          </Link>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/studio"
            afterSelectOrganizationUrl="/studio"
          />
          <UserButton />
        </div>
        <nav className="mobile-studio-nav" aria-label="Studio navigation">
          <Link href="/studio">Projects</Link>
          <Link href="/studio/settings">Settings</Link>
        </nav>
        {children}
      </div>
    </div>
  );
}
