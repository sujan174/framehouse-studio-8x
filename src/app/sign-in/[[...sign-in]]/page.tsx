import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="wordmark">
        <span className="mark">F.</span> FRAMEHOUSE <small>STUDIO</small>
      </Link>
      <div className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">YOUR CREATIVE SPACE</p>
          <h1>
            Welcome
            <br />
            <em>back.</em>
          </h1>
          <p>Pick up where your best ideas left off.</p>
        </div>
        <SignIn routing="path" path="/sign-in" forceRedirectUrl="/studio" />
      </div>
    </main>
  );
}
