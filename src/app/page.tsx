import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  signInAsDevPreview,
  signInWithGoogle,
  signInWithStrava,
} from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { GoogleIcon } from "@/components/GoogleIcon";
import { StravaIcon } from "@/components/StravaIcon";
import { isDevPreviewEnabled } from "@/lib/dev-preview";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) {
    redirect(params.callbackUrl || "/app");
  }

  const showDevPreview = isDevPreviewEnabled();

  return (
    <main className="landing">
      <div className="landing__wrap">
        <header className="landing__header">
          <BrandLogo asLink={false} />
          <form action={signInWithGoogle}>
            <button className="btn btn-ghost" type="submit">
              Sign in
            </button>
          </form>
        </header>

        <section className="landing__hero">
          <div>
            <h1 className="landing__title display">
              See if you&apos;ll hit your goal time.
            </h1>
            <p className="landing__lead">
              Set the race and a recent result. Get a verdict before you commit
              to the block.
            </p>
            <form action={signInWithGoogle}>
              <button className="btn btn-primary" type="submit">
                <GoogleIcon />
                Continue with Google
              </button>
            </form>
            <form action={signInWithStrava} className="landing__demo">
              <button className="btn btn-ghost" type="submit">
                <StravaIcon />
                Continue with Strava
              </button>
            </form>
            {showDevPreview ? (
              <form action={signInAsDevPreview} className="landing__demo">
                <button className="btn btn-ghost" type="submit">
                  Continue as Demo Runner
                </button>
              </form>
            ) : null}
          </div>

          <aside className="landing__card" aria-label="Forecast preview">
            <div className="landing__week" aria-hidden="true">
              <div className="landing__day">M</div>
              <div className="landing__day landing__day--on">T</div>
              <div className="landing__day">W</div>
              <div className="landing__day landing__day--accent">T</div>
              <div className="landing__day">F</div>
              <div className="landing__day landing__day--on">S</div>
              <div className="landing__day">S</div>
            </div>
            <p className="landing__v-status display">On track</p>
            <p className="landing__v-time mono">
              1:42:18 <span>goal 1:45:00</span>
            </p>
            <p className="landing__v-note">
              Half · Oct 18. Built from a baseline race or synced efforts.
            </p>
          </aside>
        </section>

        <ol className="landing__steps">
          <li>
            <h2 className="display">Create your account</h2>
            <p>
              Sign in with Google or continue with Strava. If you used Google,
              connect Strava later from Profile for synced history.
            </p>
          </li>
          <li>
            <h2 className="display">Set the race</h2>
            <p>Distance, target time, race date, and a recent race baseline.</p>
          </li>
          <li>
            <h2 className="display">Get the verdict</h2>
            <p>On track, at risk, or unlikely — plus what happens if intensity changes.</p>
          </li>
        </ol>

        <footer className="landing__footer">
          <p>
            Disclaimer: TruePace provides estimates only. It is not
            coaching, medical, or training advice. Always progress training
            safely and consult a professional when needed.
          </p>
          <p>
            <Link href="/privacy" className="landing__privacy">
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
