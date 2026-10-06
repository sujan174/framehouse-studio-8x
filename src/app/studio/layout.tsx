import { auth } from "@clerk/nextjs/server";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioNavigation } from "@/components/studio-navigation";
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
        <StudioNavigation />
        <div className="sidebar-bottom">
          <span className="sidebar-label">ACCOUNT</span>
          <UserButton />
        </div>
      </aside>
      <div className="studio-content" key={session.orgId}>
        <div className="mobile-studio-head">
          <Link href="/studio" className="wordmark">
            <span className="mark">F.</span> <span className="mobile-brand-text">FRAMEHOUSE</span>
          </Link>
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/studio"
            afterSelectOrganizationUrl="/studio"
          />
          <UserButton />
        </div>
        <StudioNavigation mobile />
        {children}
      </div>
    </div>
  );
}
