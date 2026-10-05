"use client";
/* Private, session-authorized image routes are rendered directly without an optimizer cache. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowDownToLine, ArrowUpRight, ArrowUp, ArrowDown, ImagePlus, RotateCcw, X, Heart, PanelsTopLeft, Plus, Trash2 } from "lucide-react";
import type { GenerationView } from "@/server/generations/view";
import type { CreativeStateView } from "@/server/creative/repository";

const example = "A sunlit glass greenhouse in a quiet forest, lush ferns, soft morning mist, cinematic natural light";
const presets = [
  { id: "cinematic", title: "Cinematic scene", effect: "Wide framing, atmosphere and expressive light", prompt: "A solitary traveler crossing a rain-soaked city street at blue hour, wide cinematic composition, atmospheric reflections, expressive side light, layered depth" },
  { id: "product", title: "Product photography", effect: "Clean silhouette, material detail and soft studio light", prompt: "A sculptural glass perfume bottle on warm stone, premium product photography, crisp material detail, balanced composition, soft studio lighting, subtle shadows" },
  { id: "editorial", title: "Editorial portrait", effect: "Human expression, considered styling and natural texture", prompt: "An editorial portrait of a creative director in a sunlit studio, relaxed expression, considered styling, natural skin texture, warm directional light, quiet background" },
] as const;
const failureCopy: Record<string, string> = {
  provider_timeout: "The image provider timed out. Your prompt is saved; try another version.",
  provider_quota: "The free image allowance is exhausted for today. Try again after the daily reset.",
  provider_unavailable: "The image provider could not complete this request. Try again later.",
  invalid_output: "The provider returned an unusable image. Try another version.",
  interrupted: "The service restarted during this image. Your prompt is saved; try another version.",
  configuration: "Image generation is temporarily unavailable. The service needs provider configuration.",
  project_archived: "This project was archived before image creation began.",
};

export function ImageWorkspace({ projectId, projectTitle, serverOrgId, initialGenerations, initialDailyUsed, initialCreativeState, available }: {
  projectId: string;
  projectTitle: string;
  serverOrgId: string;
  initialGenerations: GenerationView[];
  initialDailyUsed: number;
  initialCreativeState: CreativeStateView;
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
  const [creative, setCreative] = useState(initialCreativeState);
  const persistedCreative = useRef(initialCreativeState);
  const [savingCreative, setSavingCreative] = useState(false);
  const [view, setView] = useState<"create" | "storyboard">("create");
  const [showShortlist, setShowShortlist] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [savedPrompt, setSavedPrompt] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
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
          if (typeof value === "object" && value !== null && "savedPrompt" in value && typeof value.savedPrompt === "string")
            setSavedPrompt(value.savedPrompt.slice(0, 2048));
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
    try { localStorage.setItem(draftKey, JSON.stringify({ prompt, steps, savedPrompt })); } catch { /* Storage may be disabled. */ }
  }, [draftKey, loadedDraftKey, prompt, steps, savedPrompt, switching]);

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
  function applyPreset(preset: typeof presets[number]) {
    const currentPreset = presets.find((item) => item.id === activePreset);
    if (prompt.trim() && prompt !== preset.prompt && (!currentPreset || prompt !== currentPreset.prompt)) setSavedPrompt(prompt);
    updatePrompt(preset.prompt);
    setActivePreset(preset.id);
    promptRef.current?.focus();
  }
  async function saveCreative(next: Pick<CreativeStateView, "shortlist" | "frames">) {
    if (switching || savingCreative) return;
    setSavingCreative(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/creative`, {
        method: "PUT", headers: { "Content-Type": "application/json", "X-Workspace-Id": serverOrgId },
        body: JSON.stringify({ ...next, revision: creative.revision }),
      });
      const body = await response.json() as { state?: CreativeStateView; error?: string };
      if (!response.ok || !body.state) throw new Error(body.error ?? "Could not save your selection");
      if (activeOrg.current === serverOrgId) { persistedCreative.current = body.state; setCreative(body.state); }
    } catch (error) {
      if (activeOrg.current === serverOrgId) setMessage(error instanceof Error ? error.message : "Could not save your selection");
    } finally { setSavingCreative(false); }
  }
  function toggleShortlist(id: string) {
    void saveCreative({ ...creative, shortlist: creative.shortlist.includes(id) ? creative.shortlist.filter((item) => item !== id) : [...creative.shortlist, id] });
  }
  function toggleFrame(id: string) {
    const exists = creative.frames.some((frame) => frame.generationId === id);
    void saveCreative({ ...creative, frames: exists ? creative.frames.filter((frame) => frame.generationId !== id) : [...creative.frames, { generationId: id, caption: "" }] });
  }
  function moveFrame(index: number, direction: -1 | 1) {
    const frames = [...creative.frames];
    const next = index + direction;
    if (next < 0 || next >= frames.length) return;
    [frames[index], frames[next]] = [frames[next], frames[index]];
    void saveCreative({ ...creative, frames });
  }
  async function exportStory() {
    if (switching || !creative.frames.length) return;
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/creative/export`, { cache: "no-store" });
      if (!response.ok || response.headers.get("content-type") !== "image/png") throw new Error();
      const blob = await response.blob();
      if (activeOrg.current !== serverOrgId) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `framehouse-story-${projectId}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch { if (activeOrg.current === serverOrgId) setMessage("Could not export the story. Check your workspace and try again."); }
  }
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
    setActivePreset(null);
    requestId.current = null;
    setMessage("");
    setView("create");
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
    <nav className="creative-tabs" aria-label="Project views"><button type="button" className={view === "create" ? "active" : ""} onClick={() => setView("create")}>Create <span>{generations.filter((item) => item.status === "succeeded").length} images</span></button><button type="button" className={view === "storyboard" ? "active" : ""} onClick={() => setView("storyboard")}>Storyboard <span>{creative.frames.length} frames</span></button></nav>
    {message && <p role="alert" className="form-error creative-error">{message}</p>}
    {view === "create" ? <div className="creative-layout">
    <section className="image-composer" ref={composerRef} aria-labelledby="composer-title">
      <div className="composer-heading">
        <div><p className="section-index">01 / CREATE</p><h2 id="composer-title">Create an image</h2><p>Choose a direction or write your own scene.</p></div>
        <span className="model-label">FLUX.1 schnell</span>
      </div>
      <div className="preset-list" aria-label="Prompt directions">{presets.map((preset) => <button type="button" key={preset.id} className={`preset-card ${activePreset === preset.id ? "selected" : ""}`} onClick={() => applyPreset(preset)} aria-label={`Use ${preset.title} prompt starter: ${preset.effect}`}><span className={`preset-art preset-${preset.id}`} aria-hidden="true"/><span><strong>{preset.title}</strong><small>{preset.effect}</small></span></button>)}</div>
      <p className="preset-note">Original graphic guides · Prompt templates, not model examples</p>
      {savedPrompt && <button type="button" className="restore-draft" onClick={() => { updatePrompt(savedPrompt); setSavedPrompt(null); setActivePreset(null); promptRef.current?.focus(); }}>Restore previous draft</button>}
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
    </section>

    <section className="image-feed" aria-labelledby="feed-title">
      <div className="feed-heading"><div><p className="section-index">02 / YOUR WORK</p><h2 id="feed-title">Image gallery</h2></div><span>{generations.length} {generations.length === 1 ? "version" : "versions"}</span></div>
      <div className="gallery-toolbar"><button type="button" className={showShortlist ? "active" : ""} onClick={() => setShowShortlist(!showShortlist)}>Shortlist · {creative.shortlist.length}</button><span>{compareIds.length}/2 selected to compare</span></div>
      {compareIds.length === 2 && <div className="comparison" aria-label="Image comparison">{compareIds.map((id) => { const item = generations.find((generation) => generation.id === id); return item ? <div key={id}><img src={imageUrl(id)} alt={item.prompt}/><p>{item.prompt}</p><button type="button" onClick={() => reuse(item)}>Reuse this prompt</button></div> : null; })}<button type="button" className="comparison-close" onClick={() => setCompareIds([])}>Close comparison</button></div>}
      {generations.length === 0 ? <div className="image-empty"><div className="image-empty-mark"><ImagePlus size={32} /></div><h3>Your first image starts here.</h3><p>Try the example prompt above, or describe a moment of your own. Every version will stay with this project.</p></div> :
        <div className="image-grid">{generations.filter((item) => !showShortlist || creative.shortlist.includes(item.id)).map((item) => <article className="image-card" key={item.id}>
          <div className="image-frame">{item.status === "succeeded" && brokenImages[item.id] ? <div className="image-state" role="alert"><ImagePlus size={30} /><strong>Preview could not load</strong><span>Check your connection and workspace.</span><button type="button" className="image-retry" onClick={() => retryImage(item.id)}>Retry preview</button></div> : item.status === "succeeded" ? <button type="button" className="image-preview-trigger" onClick={() => setPreviewId(item.id)} aria-label={`Preview image for ${item.prompt}`}>
            <img src={imageUrl(item.id)} alt={item.prompt} loading="lazy" onError={() => setBrokenImages((current) => ({ ...current, [item.id]: true }))} />
          </button> : <div className={`image-state image-state-${item.status}`} role="status"><ImagePlus size={30} /><strong>{item.status === "queued" ? "In the queue" : item.status === "running" ? "Creating your image…" : "Image could not be made"}</strong><span>{item.status === "failed" ? failureCopy[item.failureCode ?? ""] ?? "Please try another version." : "Your prompt is saved in this project."}</span></div>}</div>
          <div className="image-card-body"><p className="image-card-prompt">{item.prompt}</p><p className="image-meta">FLUX.1 schnell · {item.steps} steps · {new Date(item.createdAt).toLocaleDateString()}</p>
            {item.status === "succeeded" && <div className="curation-actions"><button type="button" disabled={savingCreative || (!creative.shortlist.includes(item.id) && creative.shortlist.length >= 12)} aria-pressed={creative.shortlist.includes(item.id)} onClick={() => toggleShortlist(item.id)}><Heart size={15} fill={creative.shortlist.includes(item.id) ? "currentColor" : "none"}/> {creative.shortlist.includes(item.id) ? "Shortlisted" : "Shortlist"}</button><button type="button" aria-pressed={compareIds.includes(item.id)} onClick={() => setCompareIds((current) => current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current.slice(-1), item.id])}><PanelsTopLeft size={15}/> Compare</button><button type="button" disabled={savingCreative || (!creative.frames.some((frame) => frame.generationId === item.id) && creative.frames.length >= 8)} onClick={() => toggleFrame(item.id)}><Plus size={15}/> {creative.frames.some((frame) => frame.generationId === item.id) ? "Remove from story" : "Add to story"}</button></div>}
            <div className="image-actions"><button type="button" onClick={() => reuse(item)}><RotateCcw size={15} /> Use prompt again</button>
              {item.status === "succeeded" && <button type="button" onClick={() => void downloadImage(item.id)}><ArrowDownToLine size={15} /> Download</button>}
            </div>
          </div>
        </article>)}</div>}
      {showShortlist && !creative.shortlist.length && <p className="gallery-empty-note">No shortlisted images yet. Use Shortlist on a result you want to keep close.</p>}
    </section>
    </div> : <section className="storyboard" aria-labelledby="storyboard-title"><div className="storyboard-heading"><div><p className="section-index">03 / CURATE</p><h2 id="storyboard-title">{projectTitle} / visual story</h2><p>Arrange successful images, add captions, and export a PNG contact sheet. Frames remain in your gallery.</p></div><button type="button" className="button" disabled={!creative.frames.length} onClick={() => void exportStory()}><ArrowDownToLine size={17}/> Export PNG</button></div>
      {!creative.frames.length ? <div className="image-empty"><PanelsTopLeft size={32}/><h3>Start with a strong image.</h3><p>Open Create and add a generated result to your story. Reorder it here when you have more.</p><button type="button" className="button button-small" onClick={() => setView("create")}>Browse images</button></div> : <ol className="storyboard-grid">{creative.frames.map((frame, index) => <li key={frame.generationId} className="story-frame"><div className="story-image"><img src={imageUrl(frame.generationId)} alt={generations.find((item) => item.id === frame.generationId)?.prompt ?? "Story frame"}/><span>{String(index + 1).padStart(2, "0")}</span></div><label htmlFor={`caption-${frame.generationId}`}>Caption</label><input id={`caption-${frame.generationId}`} maxLength={160} value={frame.caption} disabled={savingCreative} placeholder="Describe this moment" onChange={(event) => setCreative((current) => ({ ...current, frames: current.frames.map((part) => part.generationId === frame.generationId ? { ...part, caption: event.target.value } : part) }))} onBlur={() => { if (creative.frames[index].caption !== persistedCreative.current.frames.find((part) => part.generationId === frame.generationId)?.caption) void saveCreative(creative); }}/><div className="frame-controls"><button type="button" disabled={savingCreative || index === 0} onClick={() => moveFrame(index, -1)} aria-label={`Move frame ${index + 1} earlier`}><ArrowUp size={16}/> Earlier</button><button type="button" disabled={savingCreative || index === creative.frames.length - 1} onClick={() => moveFrame(index, 1)} aria-label={`Move frame ${index + 1} later`}><ArrowDown size={16}/> Later</button><button type="button" disabled={savingCreative} onClick={() => toggleFrame(frame.generationId)} aria-label={`Remove frame ${index + 1} from story`}><Trash2 size={16}/> Remove</button></div></li>)}</ol>}
      <p className="story-footnote">Manually curated from this project’s images · No video or character consistency guarantee</p>
    </section>}
    <dialog ref={dialogRef} className="image-dialog" onClose={() => setPreviewId(null)} aria-label="Image preview">
      {previewId && <><button type="button" className="image-dialog-close" onClick={() => dialogRef.current?.close()} aria-label="Close preview"><X size={22} /></button>
        {brokenImages[previewId] ? <div className="image-state" role="alert"><strong>Preview could not load</strong><button type="button" className="image-retry" onClick={() => retryImage(previewId)}>Retry preview</button></div> : <>
          <img src={imageUrl(previewId)} alt={generations.find((item) => item.id === previewId)?.prompt ?? "Generated image"} onError={() => setBrokenImages((current) => ({ ...current, [previewId]: true }))} />
        </>}
        <button type="button" className="button button-small" onClick={() => void downloadImage(previewId)}><ArrowDownToLine size={16} /> Download image</button></>}
    </dialog>
  </div>;
}
