import Link from "next/link";
import { ArrowUpRight, Images, LayoutGrid, Share2 } from "lucide-react";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header wrap">
        <Link href="/" className="wordmark">
          <span className="mark">F.</span> FRAMEHOUSE <small>STUDIO</small>
        </Link>
        <nav aria-label="Public navigation">
          <Link className="text-link" href="/sign-in">
            Sign in
          </Link>
          <Link className="button button-small" href="/sign-up">
            Enter studio <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">A SPACE FOR VISUAL IDEAS</p>
          <h1>
            Make an image.
            <br />
            <em>Make it mean more.</em>
          </h1>
          <p className="hero-description">
            Start with a prompt or a visual reference. Make an image, keep the
            strongest versions, and shape them into a story you can share.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/sign-up">
              Start a workspace <ArrowUpRight size={18} />
            </Link>
            <Link className="ghost-link" href="/sign-in">
              I have an account ↗
            </Link>
          </div>
          <p className="hero-note">Create → select → arrange → share</p>
        </div>
        <div className="hero-editorial" aria-label="Illustrative visual sequence using licensed editorial photography">
          {/* CC0 editorial photographs are illustrative, not Framehouse outputs. */}
          {/* eslint-disable @next/next/no-img-element */}
          <img className="hero-editorial-main" src="/editorial/frontenac-dusk.jpg" alt="Chateau Frontenac illuminated at dusk" />
          <div className="hero-editorial-detail"><img src="/editorial/petit-champlain-night.jpg" alt="A warmly lit stone street at night"/><span>02 / A second frame</span></div>
          <div className="hero-editorial-caption"><span>01 / A visual direction</span><span>Illustrative editorial photographs · CC0</span></div>
        </div>
      </section>
      <div className="journey-line wrap"><span>01 &nbsp; Create</span><span>02 &nbsp; Keep the strongest</span><span>03 &nbsp; Tell the story</span></div>
      <section
        className="landing-features wrap"
        aria-label="Current capabilities"
      >
        <div>
          <Images />
          <h2>Create from a direction</h2>
          <p>Start with words or a private image reference.</p>
        </div>
        <div>
          <LayoutGrid />
          <h2>Choose what works</h2>
          <p>Shortlist and compare versions in one project.</p>
        </div>
        <div>
          <Share2 />
          <h2>Present a visual story</h2>
          <p>Arrange frames, add captions, then export or share.</p>
        </div>
      </section>
      <footer className="landing-footer wrap">
        <span>FRAMEHOUSE / 2026</span>
        <span>CREATE WHAT COMES NEXT</span>
      </footer>
    </main>
  );
}
