import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

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

  return (
    <main>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 0",
        }}
        className="container"
      >
        <div className="display" style={{ fontSize: "1.35rem" }}>
          Race Goal <span style={{ color: "var(--accent)" }}>Forecaster</span>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("strava", { redirectTo: "/onboarding" });
          }}
        >
          <button className="btn btn-primary" type="submit">
            Continue with Strava
          </button>
        </form>
      </header>

      <section className="container" style={{ padding: "3rem 0 4rem" }}>
        <p className="eyebrow">Trail-tested race forecasting</p>
        <h1
          className="display"
          style={{ fontSize: "clamp(2.6rem, 8vw, 4.8rem)", maxWidth: "14ch", margin: "0.6rem 0 1rem" }}
        >
          Will you hit your race goal?
        </h1>
        <p className="muted" style={{ maxWidth: "38rem", fontSize: "1.1rem", lineHeight: 1.65 }}>
          Connect Strava, set a finish time and race date, choose how hard you&apos;re willing
          to train, and get a clear on-track verdict — plus what happens if you push harder.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.75rem" }}>
          <form
            action={async () => {
              "use server";
              await signIn("strava", { redirectTo: "/onboarding" });
            }}
          >
            <button className="btn btn-primary" type="submit">
              Continue with Strava
            </button>
          </form>
        </div>
      </section>

      <section className="container" style={{ display: "grid", gap: "1rem", paddingBottom: "3rem" }}>
        {[
          {
            title: "Goal + date",
            body: "Pick 5K, 10K, half, or marathon. Enter your target finish time and race day.",
          },
          {
            title: "Training posture",
            body: "Conservative, Balanced, or Aggressive — how hard you’ll train in the block.",
          },
          {
            title: "Honest forecast",
            body: "We use your best recent efforts and weekly volume, not junk-mile averages.",
          },
        ].map((item) => (
          <article key={item.title} className="card">
            <h2 className="display" style={{ fontSize: "1.6rem", margin: "0 0 0.4rem" }}>
              {item.title}
            </h2>
            <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
              {item.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="container" style={{ padding: "2rem 0 3rem", borderTop: "1px solid var(--border)" }}>
        <p className="mono muted" style={{ fontSize: "0.75rem", lineHeight: 1.7, maxWidth: "40rem" }}>
          Disclaimer: Race Goal Forecaster provides estimates only. It is not coaching, medical,
          or training advice. Always progress training safely and consult a professional when needed.
        </p>
      </footer>
    </main>
  );
}
