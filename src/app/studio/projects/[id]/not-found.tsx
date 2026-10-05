import Link from "next/link";
export default function ProjectNotFound() {
  return (
    <main className="studio-main">
      <div className="empty-state">
        <span className="empty-icon">?</span>
        <h1>Project unavailable</h1>
        <p>
          This project may have moved, been archived, or belong to another
          workspace.
        </p>
        <Link href="/studio" className="button">
          Back to projects
        </Link>
      </div>
    </main>
  );
}
