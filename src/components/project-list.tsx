"use client";
/* Private covers use authorized image routes directly. */
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowUpRight, Plus, FolderOpen } from "lucide-react";
import type { Project } from "@/server/db/schema";
export function ProjectList({
  initialProjects,
  initialCovers,
  serverOrgId,
}: {
  initialProjects: Project[];
  initialCovers: Record<string, string>;
  serverOrgId: string;
}) {
  const { orgId, isLoaded } = useAuth();
  const [projects, setProjects] = useState(initialProjects);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const switching = !isLoaded || orgId !== serverOrgId;
  function openCreate(event: React.MouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setOpen(true);
  }
  function closeCreate() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
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
      closeCreate();
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
            <button className="button" onClick={openCreate}>
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
                    {initialCovers[p.id] ? <img src={`/api/projects/${p.id}/generations/${initialCovers[p.id]}/image`} alt="" loading="lazy" /> : <div className="project-cover-empty"><span className="cover-shape cover-shape-one"/><span className="cover-shape cover-shape-two"/><span className="cover-shape cover-shape-three"/><strong>Ready for its first frame</strong></div>}
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
              <button className="button" onClick={openCreate}>
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
            if (e.target === e.currentTarget) closeCreate();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeCreate();
              }
              if (event.key !== "Tab") return;
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled), input:not(:disabled)",
                ),
              );
              const first = buttons[0];
              const last = buttons.at(-1);
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <button
              className="close-button"
              onClick={closeCreate}
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
                  onClick={closeCreate}
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
