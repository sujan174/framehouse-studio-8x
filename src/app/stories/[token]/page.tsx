import type { Metadata } from "next";
import Link from "next/link";
/* Public token image routes must bypass the shared image optimizer cache. */
/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { getPublicStory } from "@/server/creative/publication";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared story · Framehouse", robots: { index: false, follow: false } };
export default async function StoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const story = await getPublicStory(db, token);
  if (!story) notFound();
  return <main className="public-story"><div className="public-story-top"><Link href="/">FRAMEHOUSE</Link><span>Shared visual story</span></div>
    <header><p className="eyebrow">A CURATED STORY</p><h1>{story.title}</h1><p>{story.frameCount} {story.frameCount === 1 ? "frame" : "frames"} · Presented by its creator</p></header>
    <ol>{story.frames.map((frame, index) => <li key={index}><img src={`/api/stories/${token}/frames/${index}`} alt={`Frame ${index + 1}`} /><div><span>{String(index + 1).padStart(2, "0")}</span><p>{frame.caption || "Untitled frame"}</p></div></li>)}</ol>
    <footer>Framehouse · A visual story assembled by hand</footer></main>;
}
