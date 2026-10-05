import type { Metadata } from "next";
import { OrganizationProfile } from "@clerk/nextjs";
export const metadata: Metadata = { title: "Workspace settings" };
export default function SettingsPage() {
  return (
    <main className="studio-main">
      <header className="studio-page-header">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Settings</h1>
          <p>Manage your workspace and members.</p>
        </div>
      </header>
      <div className="settings-panel">
        <OrganizationProfile routing="hash" />
      </div>
    </main>
  );
}
