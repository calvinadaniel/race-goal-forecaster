import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · TruePace",
  description: "How TruePace handles account and Strava activity data.",
};

export default function PrivacyPage() {
  return (
    <main className="container app-page max-w-2xl py-12">
      <p className="eyebrow m-0">TruePace</p>
      <h1 className="display my-2 text-[clamp(1.8rem,5vw,2.4rem)]">
        Privacy Policy
      </h1>
      <p className="muted text-sm">Last updated: July 27, 2026</p>
      <p className="muted text-sm m-0">
        Public URL:{" "}
        <a
          className="text-primary underline-offset-4 hover:underline"
          href="https://race-goal-forecaster.vercel.app/privacy"
        >
          https://race-goal-forecaster.vercel.app/privacy
        </a>
      </p>

      <div className="space-y-6 mt-8 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">Who we are</h2>
          <p className="muted m-0">
            TruePace is a web app that forecasts race finish times from a
            runner&apos;s training history and goals. This policy describes how we
            handle account and activity data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">What we collect</h2>
          <p className="muted m-0">
            <strong className="text-foreground font-semibold">Account:</strong>{" "}
            When you sign in with Google, we store identifiers, name, email, and
            profile image.
          </p>
          <p className="muted mt-3 mb-0">
            <strong className="text-foreground font-semibold">Strava (optional):</strong>{" "}
            If you connect Strava, we request read access (
            <code className="mono text-sm">read</code>,{" "}
            <code className="mono text-sm">activity:read_all</code>) and store
            OAuth tokens plus authorized activity data: distance, duration, start
            time, average heart rate when present, suffer score when present, and
            race/workout flags. We do not request write or social messaging
            scopes.
          </p>
          <p className="muted mt-3 mb-0">
            <strong className="text-foreground font-semibold">Manual input:</strong>{" "}
            You may enter a race goal and a manual race/time-trial baseline.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How we use it</h2>
          <p className="muted m-0">
            Activity and baseline data power finish-time forecasts and in-app
            training guidance. We do not sell personal data. We do not post
            activities, comments, or kudos to Strava, and we do not contact other
            athletes on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Sharing</h2>
          <p className="muted m-0">
            We use infrastructure processors (e.g. Vercel hosting, Neon Postgres)
            to run the app. We do not share Strava activity data with advertisers
            or unrelated third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Connected services &amp; control</h2>
          <p className="muted m-0">
            You can disconnect Strava from Profile → Connections without deleting
            your TruePace account. You can log out anytime. You can also revoke
            TruePace in Strava (Settings → My Apps) or Google account permissions;
            that stops future sign-in or sync from that provider.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Retention &amp; deletion</h2>
          <p className="muted m-0">
            We keep account and synced activity data while your account is active
            so forecasts remain available. For deletion requests, contact us via
            the project repository; we will remove account data from our systems
            within a reasonable period.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="muted m-0">
            Privacy questions or deletion requests:{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="https://github.com/calvinadaniel/race-goal-forecaster"
            >
              github.com/calvinadaniel/race-goal-forecaster
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-10">
        <Link
          href="/"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          ← Back to TruePace
        </Link>
      </p>
    </main>
  );
}
