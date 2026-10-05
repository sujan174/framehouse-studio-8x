"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Project } from "@/server/db/schema";
export function ProjectEditor({
  initialProject,
  serverOrgId,
  canArchive,
}: {
  initialProject: Project;
  serverOrgId: string;
  canArchive: boolean;
}) {
  const { orgId, isLoaded } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState(initialProject.title);
  const [description, setDescription] = useState(
    initialProject.description || "",
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const switching = !isLoaded || orgId !== serverOrgId;
  async function mutate(method: "PATCH" | "DELETE") {
    if (switching || pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${initialProject.id}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": serverOrgId,
        },
        body:
          method === "PATCH"
            ? JSON.stringify({ title, description })
            : undefined,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save");
      if (orgId !== serverOrgId) return;
      if (method === "DELETE") {
        router.replace("/studio");
        router.refresh();
      } else {
        setMessage("Saved. Your changes are available to this workspace.");
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save");
    } finally {
      setPending(false);
    }
  }
  if (switching)
    return (
      <div className="empty-state">
        <h2>Switching workspace…</h2>
        <p>Loading the right project.</p>
      </div>
    );
  return (
    <article className="project-editor">
      <div className="editor-top">
        <div>
          <p className="eyebrow">PROJECT / WORKSPACE</p>
          <h1>{initialProject.title}</h1>
          <p>
            Created {new Date(initialProject.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="project-state">ACTIVE PROJECT</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void mutate("PATCH");
        }}
      >
        <div className="editor-section">
          <p className="section-index">01 / OVERVIEW</p>
          <h2>Shape the brief</h2>
          <p>
            Give this project a clear direction. You can refine it as your work
            evolves.
          </p>
          <label htmlFor="edit-title">Project title</label>
          <input
            id="edit-title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="edit-description">
            Description <span>Optional · max 2,000 characters</span>
          </label>
          <textarea
            id="edit-description"
            maxLength={2000}
            rows={7}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you making, and why?"
          />
          <div className="editor-actions">
            <button
              className="button"
              type="submit"
              disabled={pending || !title.trim()}
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            {message && (
              <p
                role="status"
                className={
                  message.startsWith("Saved") ? "form-success" : "form-error"
                }
              >
                {message}
              </p>
            )}
          </div>
        </div>
      </form>
      {canArchive && (
        <div className="archive-section">
          <div>
            <h2>Archive project</h2>
            <p>
              Remove this project from the active studio. This does not delete
              its record.
            </p>
          </div>
          {confirm ? (
            <div className="archive-confirm">
              <span>Archive “{initialProject.title}”?</span>
              <button
                className="button button-danger"
                disabled={pending}
                onClick={() => void mutate("DELETE")}
              >
                Yes, archive
              </button>
              <button
                className="button button-secondary"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="button button-secondary"
              onClick={() => setConfirm(true)}
            >
              Archive project
            </button>
          )}
        </div>
      )}
    </article>
  );
}
