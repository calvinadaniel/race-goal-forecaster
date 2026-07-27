import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

async function stravaSignIn() {
  "use server";
  await signIn("strava", { redirectTo: "/onboarding" });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) {
    redirect(params.callbackUrl || "/app/forecast");
  }

  return (
    <main className="landing">
      <div className="landing__wrap">
        <header className="landing__header">
          <BrandLogo asLink={false} />
          <form action={stravaSignIn}>
            <button className="btn btn-primary landing__btn" type="submit">
              Continue with Strava
            </button>
          </form>
        </header>

        <section className="landing__hero">
          <div>
            <p className="landing__kicker">See if you&apos;ll hit your goal time</p>
            <h1 className="landing__title display">
              Your plan starts with an honest finish time.
            </h1>
            <p className="landing__lead">
              Goal-first coaching flow — set the race, set the intensity, see a
              clear verdict before you commit to the block.
            </p>
            <form action={stravaSignIn}>
              <button className="btn btn-primary landing__btn" type="submit">
                Continue with Strava
              </button>
            </form>
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
            <p className="landing__v-label">Today&apos;s forecast</p>
            <p className="landing__v-status display">On track</p>
            <p className="landing__v-time display">
              1:42:18 <span>goal 1:45:00</span>
            </p>
            <p className="landing__v-note">
              Balanced posture · Half · Oct 18. Built from your best recent
              efforts + weekly volume.
            </p>
          </aside>
        </section>

        <section className="landing__steps" id="how">
          <article className="landing__step">
            <div className="landing__step-n">1</div>
            <h2 className="display">Connect Strava</h2>
            <p>We sync your runs and pull quality efforts near race distances.</p>
          </article>
          <article className="landing__step">
            <div className="landing__step-n">2</div>
            <h2 className="display">Set the race</h2>
            <p>Distance, target time, race date, and how hard you&apos;ll train.</p>
          </article>
          <article className="landing__step">
            <div className="landing__step-n">3</div>
            <h2 className="display">Get the verdict</h2>
            <p>On track / At risk / Unlikely — plus what-if intensity scenarios.</p>
          </article>
        </section>

        <footer className="landing__footer">
          <p>
            Disclaimer: TruePace provides estimates only. It is not
            coaching, medical, or training advice. Always progress training
            safely and consult a professional when needed.
          </p>
        </footer>
      </div>
    </main>
  );
}
