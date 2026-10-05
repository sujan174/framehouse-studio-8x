"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, Settings2 } from "lucide-react";

export function StudioNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const inSettings = pathname.startsWith("/studio/settings");
  return (
    <nav
      className={mobile ? "mobile-studio-nav" : "studio-nav"}
      aria-label="Studio navigation"
    >
      <Link href="/studio" aria-current={inSettings ? undefined : "page"}>
        {!mobile && <FolderKanban size={19} />} Projects
      </Link>
      <Link
        href="/studio/settings"
        aria-current={inSettings ? "page" : undefined}
      >
        {!mobile && <Settings2 size={19} />} Settings
      </Link>
    </nav>
  );
}
