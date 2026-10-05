import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="wordmark">
        <span className="mark">F.</span> FRAMEHOUSE <small>STUDIO</small>
      </Link>
      <div className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">A PLACE TO BEGIN</p>
          <h1>
            Start
            <br />
            <em>creating.</em>
          </h1>
          <p>Your first workspace is a few steps away.</p>
        </div>
        <SignUp routing="path" path="/sign-up" forceRedirectUrl="/workspaces" />
      </div>
    </main>
  );
}
