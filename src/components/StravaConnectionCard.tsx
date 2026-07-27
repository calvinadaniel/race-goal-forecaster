"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Unplug } from "lucide-react";
import { connectStrava } from "@/app/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { SectionHeading, SurfaceCard } from "@/components/ui-surface";

export function StravaConnectionCard({ onChanged }: { onChanged?: () => void }) {
  const [strava, setStrava] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/connections");
    if (!res.ok) {
      setError("Could not load connections");
      return;
    }
    const data = await res.json();
    setStrava(Boolean(data.strava));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "strava" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not disconnect");
        return;
      }
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="app-section">
      <SectionHeading icon={Link2} title="Connections" />
      <SurfaceCard interactive={false}>
        <CardContent className="space-y-0 px-0 py-0">
          {error ? (
            <p className="text-destructive px-4 py-3 text-sm">{error}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="m-0 font-semibold">Strava</p>
              <p className="muted m-0 text-sm">
                {strava == null
                  ? "Loading…"
                  : strava
                    ? "Synced races and workouts improve your forecast"
                    : "Optional — connect to sync training history"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {strava ? (
                <Badge className="rounded-full">Connected</Badge>
              ) : strava === false ? (
                <Badge variant="outline" className="rounded-full">
                  Not connected
                </Badge>
              ) : null}
              {strava === false ? (
                <form action={connectStrava}>
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-xl font-bold"
                    disabled={busy}
                  >
                    Connect Strava
                  </Button>
                </form>
              ) : null}
              {strava ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl font-bold"
                  disabled={busy}
                  onClick={() => void disconnect()}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Unplug className="size-4" />
                  )}
                  Disconnect
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </SurfaceCard>
    </section>
  );
}
