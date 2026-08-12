"use client";

import { useEffect, useRef } from "react";
import { signInAsDevPreview } from "@/app/actions/auth";

/** Auto-enters the seeded demo session when AUTH_DEV_BYPASS=1. */
export default function DevPreviewEnterPage() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  return (
    <main className="landing">
      <div className="landing__wrap" style={{ paddingTop: "4rem" }}>
        <p className="landing__lead">Signing in as Demo Runner…</p>
        <form ref={formRef} action={signInAsDevPreview}>
          <button className="btn btn-primary landing__btn" type="submit">
            Continue as Demo Runner
          </button>
        </form>
        <p className="landing__v-note" style={{ marginTop: "1rem" }}>
          Requires <code>AUTH_DEV_BYPASS=1</code> in <code>.env.local</code>.
        </p>
      </div>
    </main>
  );
}
