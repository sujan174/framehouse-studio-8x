import Link from "next/link";
import { ArrowUpRight, Layers3, ShieldCheck, Sparkles } from "lucide-react";

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
          <p className="eyebrow">AN INDEPENDENT CREATIVE STUDIO</p>
          <h1>
            Make the image.
            <br />
            <em>Find the story.</em>
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
          <p className="hero-note">
            Independent creative studio · Built for the 8x assignment
          </p>
        </div>
        <div className="hero-editorial" aria-label="Editorial photography illustrating visual direction">
          {/* These CC0 editorial photographs illustrate the creative process, not AI outputs. */}
          {/* eslint-disable @next/next/no-img-element */}
          <img className="hero-editorial-main" src="/editorial/frontenac-dusk.jpg" alt="Chateau Frontenac illuminated at dusk" />
          <img className="hero-editorial-detail" src="/editorial/petit-champlain-night.jpg" alt="A warmly lit stone street at night" />
          <div className="hero-editorial-caption"><span>FRAMEHOUSE / VISUAL DIRECTION</span><span>Editorial photography · CC0</span></div>
        </div>
      </section>
      <section
        className="landing-features wrap"
        aria-label="Current capabilities"
      >
        <div>
          <Layers3 />
          <h2>Projects with purpose</h2>
          <p>Keep prompts, generated images, and storyboards together.</p>
        </div>
        <div>
          <ShieldCheck />
          <h2>Space for your team</h2>
          <p>Each workspace keeps its projects private and distinct.</p>
        </div>
        <div>
          <Sparkles />
          <h2>Create, curate, export</h2>
          <p>Start from a direction, compare results, and export your visual story.</p>
        </div>
      </section>
      <footer className="landing-footer wrap">
        <span>FRAMEHOUSE / 2026</span>
        <span>AN INDEPENDENT ASSIGNMENT PROJECT</span>
      </footer>
    </main>
  );
}
