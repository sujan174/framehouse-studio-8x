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
          <p className="eyebrow">● &nbsp; THE SPACE BEFORE THE SPARK</p>
          <h1>
            Make room
            <br />
            for <em>what&apos;s next.</em>
          </h1>
          <p className="hero-description">
            Explore a direction, create images, choose your strongest frames,
            and arrange them into a story worth sharing.
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
        <div
          className="hero-art"
          role="img"
          aria-label="Abstract composition representing organized creative work"
        >
          <div className="art-grid" />
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-core">F</div>
          <div className="art-label">
            A SPACE TO CREATE
            <br />
            TOGETHER.
          </div>
          <div className="art-caption">
            <span>01 / A CLEARER STARTING POINT</span>
            <span>IDEAS INTO MOTION</span>
          </div>
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
