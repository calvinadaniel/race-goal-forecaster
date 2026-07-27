import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · TruePace",
  description: "How TruePace handles account and activity data.",
};

export default function PrivacyPage() {
  return (
    <main className="container app-page max-w-2xl py-12">
      <p className="eyebrow m-0">TruePace</p>
      <h1 className="display my-2 text-[clamp(1.8rem,5vw,2.4rem)]">
        Privacy Policy
      </h1>
      <p className="muted text-sm">Last updated: July 27, 2026</p>

      <div className="prose-privacy space-y-6 mt-8 text-[var(--foreground)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">What we collect</h2>
          <p className="muted m-0">
            When you sign in with Strava (and later Garmin, COROS, or an iOS
            companion for Apple Health), we store your account identifiers,
            display name, profile image URL when available, OAuth tokens needed
            to refresh your data, and the workouts you authorize us to read
            (distance, duration, heart rate, timestamps, and race flags).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How we use it</h2>
          <p className="muted m-0">
            Activity data powers race finish-time forecasts and training
            guidance inside TruePace. We do not sell your data. We do not post
            to your connected accounts or message other athletes on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Connected services</h2>
          <p className="muted m-0">
            You can disconnect a source anytime from Profile → Connections
            without deleting your TruePace account. Logging out ends your
            session. Revoking access in Strava (or another provider) will stop
            future syncs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Storage</h2>
          <p className="muted m-0">
            Data is stored in a Postgres database hosted on Neon and served via
            Vercel. Tokens are stored server-side and used only to sync
            activities and refresh your profile.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="muted m-0">
            For privacy questions or deletion requests, contact the TruePace
            operator via the project repository or the email used on partner API
            applications.
          </p>
        </section>
      </div>

      <p className="mt-10">
        <Link href="/" className="text-primary font-semibold underline-offset-4 hover:underline">
          ← Back to TruePace
        </Link>
      </p>
    </main>
  );
}
