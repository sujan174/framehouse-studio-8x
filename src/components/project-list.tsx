"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowUpRight, Plus, FolderOpen } from "lucide-react";
import type { Project } from "@/server/db/schema";
export function ProjectList({
  initialProjects,
  serverOrgId,
}: {
  initialProjects: Project[];
  serverOrgId: string;
}) {
  const { orgId, isLoaded } = useAuth();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const switching = !isLoaded || orgId !== serverOrgId;
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (switching || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": serverOrgId,
        },
        body: JSON.stringify({ title }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Could not create project");
      if (orgId !== serverOrgId) return;
      setProjects((p) => [body.project, ...p]);
      setTitle("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label="Workspace projects">
      {switching ? (
        <div className="empty-state">
          <h2>Switching workspace…</h2>
          <p>Loading the right projects for your workspace.</p>
        </div>
      ) : (
        <>
          <div className="project-toolbar">
            <p>
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
            <button className="button" onClick={() => setOpen(true)}>
              <Plus size={18} /> New project
            </button>
          </div>
          {projects.length ? (
            <div className="project-grid">
              {projects.map((p) => (
                <Link
                  href={`/studio/projects/${p.id}`}
                  className="project-card"
                  key={p.id}
                >
                  <div className="project-card-art">
                    <span>{p.title.slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="project-card-meta">
                    <span className="project-card-type">PROJECT</span>
                    <ArrowUpRight size={17} />
                  </div>
                  <h2>{p.title}</h2>
                  <p>{p.description || "Open to shape this project."}</p>
                  <small>
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">
                <FolderOpen size={33} />
              </span>
              <h2>Your canvas starts here.</h2>
              <p>
                Create a project to give your next idea a home. Your work stays
                in this workspace.
              </p>
              <button className="button" onClick={() => setOpen(true)}>
                <Plus size={18} /> Create first project
              </button>
            </div>
          )}
        </>
      )}
      {open && !switching && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <button
              className="close-button"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="eyebrow">NEW PROJECT</p>
            <h2 id="create-title">Give it a name.</h2>
            <p>Start simple. You can shape the details next.</p>
            <form onSubmit={create}>
              <label htmlFor="project-title">Project title</label>
              <input
                id="project-title"
                autoFocus
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer campaign"
              />
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button"
                  disabled={pending || !title.trim()}
                >
                  {pending ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
