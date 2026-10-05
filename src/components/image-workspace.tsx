"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowDownToLine, ArrowUpRight, ImagePlus, RotateCcw, X } from "lucide-react";
import type { GenerationView } from "@/server/generations/view";

const example = "A sunlit glass greenhouse in a quiet forest, lush ferns, soft morning mist, cinematic natural light";
const failureCopy: Record<string, string> = {
  provider_timeout: "The image provider timed out. Your prompt is saved; try another version.",
  provider_quota: "The free image allowance is exhausted for today. Try again after the daily reset.",
  provider_unavailable: "The image provider could not complete this request. Try again later.",
  invalid_output: "The provider returned an unusable image. Try another version.",
  interrupted: "The service restarted during this image. Your prompt is saved; try another version.",
  configuration: "Image generation is temporarily unavailable. The service needs provider configuration.",
  project_archived: "This project was archived before image creation began.",
};

export function ImageWorkspace({ projectId, serverOrgId, initialGenerations, initialDailyUsed, available }: {
  projectId: string;
  serverOrgId: string;
  initialGenerations: GenerationView[];
  initialDailyUsed: number;
  available: boolean;
}) {
  const { orgId, userId, isLoaded } = useAuth();
  const activeOrg = useRef(orgId);
  const [generations, setGenerations] = useState(initialGenerations);
  const [dailyUsed, setDailyUsed] = useState(initialDailyUsed);
  const [prompt, setPrompt] = useState(initialGenerations[0]?.prompt ?? "");
  const [steps, setSteps] = useState(initialGenerations[0]?.steps ?? 4);
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [imageAttempts, setImageAttempts] = useState<Record<string, number>>({});
  const requestId = useRef<string | null>(null);
  const submitLock = useRef(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const draftKey = userId ? `framehouse:draft:${userId}:${serverOrgId}:${projectId}` : null;
  const switching = !isLoaded || !userId || orgId !== serverOrgId || loadedDraftKey !== draftKey;
  const initialPrompt = initialGenerations[0]?.prompt ?? "";
  const initialSteps = initialGenerations[0]?.steps ?? 4;

  useEffect(() => { activeOrg.current = orgId; }, [orgId]);

  useEffect(() => {
    if (!draftKey) return;
    let stopped = false;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const value: unknown = JSON.parse(saved);
        queueMicrotask(() => {
          if (stopped) return;
          if (typeof value === "object" && value !== null && "prompt" in value && typeof value.prompt === "string")
            setPrompt(value.prompt.slice(0, 2048));
          if (typeof value === "object" && value !== null && "steps" in value &&
            typeof value.steps === "number" && [4, 6, 8].includes(value.steps))
            setSteps(value.steps);
          setLoadedDraftKey(draftKey);
        });
      } else {
        queueMicrotask(() => { if (!stopped) { setPrompt(initialPrompt); setSteps(initialSteps); setLoadedDraftKey(draftKey); } });
      }
    } catch { queueMicrotask(() => { if (!stopped) setLoadedDraftKey(draftKey); }); }
    return () => { stopped = true; };
  }, [draftKey, initialPrompt, initialSteps]);

  useEffect(() => {
    if (!draftKey || loadedDraftKey !== draftKey || switching) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ prompt, steps })); } catch { /* Storage may be disabled. */ }
  }, [draftKey, loadedDraftKey, prompt, steps, switching]);

  useEffect(() => {
    if (switching || !generations.some((item) => item.status === "queued" || item.status === "running")) return;
    let stopped = false;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/generations`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not refresh images");
        const body = await response.json() as { generations: GenerationView[]; dailyUsed: number };
        if (!stopped && activeOrg.current === serverOrgId) { setGenerations(body.generations); setDailyUsed(body.dailyUsed); }
      } catch {
        if (!stopped && activeOrg.current === serverOrgId) setMessage("Could not refresh image progress. Reload this page to try again.");
      }
    };
    const timer = setInterval(() => { void refresh(); }, 3_000);
    return () => { stopped = true; clearInterval(timer); };
  }, [generations, projectId, serverOrgId, switching]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (previewId && dialog && !dialog.open) dialog.showModal();
    if (!previewId && dialog?.open) dialog.close();
  }, [previewId]);

  function updatePrompt(value: string) { setPrompt(value); requestId.current = null; }
  function updateSteps(value: number) { setSteps(value); requestId.current = null; }
  async function submit() {
    if (switching || !available || submitLock.current || !prompt.trim()) return;
    submitLock.current = true;
    setSubmitting(true);
    setMessage("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/projects/${projectId}/generations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Workspace-Id": serverOrgId },
        body: JSON.stringify({ prompt, steps, clientRequestId: requestId.current }),
      });
      const body = await response.json() as { generation?: GenerationView; dailyUsed?: number; error?: string };
      if (!response.ok || !body.generation) throw new Error(body.error ?? "Could not start image");
      if (activeOrg.current === serverOrgId) {
        setGenerations((current) => [body.generation!, ...current.filter((item) => item.id !== body.generation!.id)]);
        if (typeof body.dailyUsed === "number") setDailyUsed(body.dailyUsed);
      }
      requestId.current = null;
    } catch (error) {
      if (activeOrg.current === serverOrgId)
        setMessage(error instanceof Error ? error.message : "Could not start image. Try again.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }
  function reuse(item: GenerationView) {
    setPrompt(item.prompt);
    setSteps(item.steps);
    requestId.current = null;
    setMessage("");
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    promptRef.current?.focus();
  }
  const imageUrl = (id: string) => `/api/projects/${projectId}/generations/${id}/image?attempt=${imageAttempts[id] ?? 0}`;
  function retryImage(id: string) {
    setBrokenImages((current) => ({ ...current, [id]: false }));
    setImageAttempts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  }
  async function downloadImage(id: string) {
    setMessage("");
    try {
      const response = await fetch(imageUrl(id), { cache: "no-store" });
      if (!response.ok || response.headers.get("content-type") !== "image/jpeg") throw new Error();
      const blob = await response.blob();
      if (activeOrg.current !== serverOrgId) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `framehouse-${id}.jpg`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      if (activeOrg.current === serverOrgId) {
        setMessage("Could not download this image. Check your connection and workspace, then try again.");
        setPreviewId(null);
      }
    }
  }

  if (switching) return <div className="empty-state"><h2>Switching workspace…</h2><p>Loading the right images for your workspace.</p></div>;
  return <div className="image-workspace">
    <section className="image-composer" ref={composerRef} aria-labelledby="composer-title">
      <div className="composer-heading">
        <div><p className="section-index">01 / CREATE</p><h2 id="composer-title">Imagine the next frame.</h2><p>Describe the image you want to make. Start with a scene, mood, and light.</p></div>
        <span className="model-label">FLUX.1 schnell</span>
      </div>
      <label htmlFor="image-prompt">Your prompt</label>
      <textarea ref={promptRef} id="image-prompt" rows={5} maxLength={2048} value={prompt}
        onChange={(event) => updatePrompt(event.target.value)} placeholder={example} />
      {!prompt && <button type="button" className="example-prompt" onClick={() => { updatePrompt(example); promptRef.current?.focus(); }}>Use an example prompt <ArrowUpRight size={15} /></button>}
      <div className="composer-footer">
        <details className="image-settings"><summary>Image settings <span>· {steps} steps</span></summary>
          <label htmlFor="image-steps">Generation steps</label>
          <select id="image-steps" value={steps} onChange={(event) => updateSteps(Number(event.target.value))}>
            <option value={4}>4 · Fast default</option><option value={6}>6 · More detail</option><option value={8}>8 · Most detail</option>
          </select><p>Higher steps take longer and use more of the free allowance. This demo allows up to five attempts per member each UTC day.</p>
        </details>
        <button type="button" className="button generate-button" disabled={!available || dailyUsed >= 5 || submitting || !prompt.trim() || generations.some((item) => item.status === "queued" || item.status === "running")}
          onClick={() => void submit()}><ImagePlus size={18} />{submitting ? "Starting…" : "Generate image"}</button>
      </div>
      <p className="composer-allowance">{dailyUsed}/5 image attempts used today · resets 00:00 UTC. Shared free capacity may end sooner.</p>
      {!available && <p role="status" className="availability-note">Image generation is being configured. Your projects remain available.</p>}
      {message && <p role="alert" className="form-error">{message}</p>}
    </section>

    <section className="image-feed" aria-labelledby="feed-title">
      <div className="feed-heading"><div><p className="section-index">02 / YOUR WORK</p><h2 id="feed-title">Images in this project</h2></div><span>{generations.length} {generations.length === 1 ? "version" : "versions"}</span></div>
      {generations.length === 0 ? <div className="image-empty"><div className="image-empty-mark"><ImagePlus size={32} /></div><h3>Your first image starts here.</h3><p>Try the example prompt above, or describe a moment of your own. Every version will stay with this project.</p></div> :
        <div className="image-grid">{generations.map((item) => <article className="image-card" key={item.id}>
          <div className="image-frame">{item.status === "succeeded" && brokenImages[item.id] ? <div className="image-state" role="alert"><ImagePlus size={30} /><strong>Preview could not load</strong><span>Check your connection and workspace.</span><button type="button" className="image-retry" onClick={() => retryImage(item.id)}>Retry preview</button></div> : item.status === "succeeded" ? <button type="button" className="image-preview-trigger" onClick={() => setPreviewId(item.id)} aria-label={`Preview image for ${item.prompt}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(item.id)} alt={item.prompt} loading="lazy" onError={() => setBrokenImages((current) => ({ ...current, [item.id]: true }))} />
          </button> : <div className={`image-state image-state-${item.status}`} role="status"><ImagePlus size={30} /><strong>{item.status === "queued" ? "In the queue" : item.status === "running" ? "Creating your image…" : "Image could not be made"}</strong><span>{item.status === "failed" ? failureCopy[item.failureCode ?? ""] ?? "Please try another version." : "Your prompt is saved in this project."}</span></div>}</div>
          <div className="image-card-body"><p className="image-card-prompt">{item.prompt}</p><p className="image-meta">FLUX.1 schnell · {item.steps} steps · {new Date(item.createdAt).toLocaleDateString()}</p>
            <div className="image-actions"><button type="button" onClick={() => reuse(item)}><RotateCcw size={15} /> Use prompt again</button>
              {item.status === "succeeded" && <button type="button" onClick={() => void downloadImage(item.id)}><ArrowDownToLine size={15} /> Download</button>}
            </div>
          </div>
        </article>)}</div>}
    </section>
    <dialog ref={dialogRef} className="image-dialog" onClose={() => setPreviewId(null)} aria-label="Image preview">
      {previewId && <><button type="button" className="image-dialog-close" onClick={() => dialogRef.current?.close()} aria-label="Close preview"><X size={22} /></button>
        {brokenImages[previewId] ? <div className="image-state" role="alert"><strong>Preview could not load</strong><button type="button" className="image-retry" onClick={() => retryImage(previewId)}>Retry preview</button></div> : <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(previewId)} alt={generations.find((item) => item.id === previewId)?.prompt ?? "Generated image"} onError={() => setBrokenImages((current) => ({ ...current, [previewId]: true }))} />
        </>}
        <button type="button" className="button button-small" onClick={() => void downloadImage(previewId)}><ArrowDownToLine size={16} /> Download image</button></>}
    </dialog>
  </div>;
}
