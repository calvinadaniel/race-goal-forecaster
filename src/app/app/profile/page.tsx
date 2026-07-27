"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, RefreshCw, Route } from "lucide-react";
import { logOut } from "@/app/actions/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceCard } from "@/components/ui-surface";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { formatDuration } from "@/lib/units";
import { useForecastData } from "@/lib/use-forecast";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { data, error, busy, refresh } = useForecastData();
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (error) {
    return (
      <AppShell>
        <main className="container app-page">
          <p className="text-destructive">{error}</p>
        </main>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <main className="container app-page space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-[72px] rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
          <Skeleton className="h-36 rounded-xl" />
        </main>
      </AppShell>
    );
  }

  const { profile, goal } = data;
  const baseline = goal.manualBaseline ?? null;
  const baselineLabel =
    baseline && baseline.distanceKey in DISTANCES
      ? DISTANCES[baseline.distanceKey as DistanceKey].label
      : null;
  const photoSrc =
    !avatarFailed && profile.image
      ? profile.image
      : !avatarFailed && profile.hasPhoto
        ? "/api/avatar"
        : undefined;

  return (
    <AppShell
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="landing__btn h-10 rounded-xl font-bold"
            type="button"
            onClick={() => {
              setAvatarFailed(false);
              void refresh();
            }}
            disabled={busy}
          >
            <RefreshCw className={cn("size-4", busy && "animate-spin")} />
            {busy ? "Refreshing…" : "Refresh"}
          </Button>
          <form action={logOut}>
            <Button
              variant="outline"
              className="landing__btn h-10 rounded-xl font-bold"
              type="submit"
            >
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </div>
      }
    >
      <main className="container app-page">
        <div className="profile-hero">
          <Avatar className="profile-hero__avatar size-[72px] border border-border shadow-sm">
            {photoSrc ? (
              <AvatarImage
                key={photoSrc}
                src={photoSrc}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
              />
            ) : null}
            <AvatarFallback className="profile-hero__avatar--placeholder bg-[var(--surface)] text-[var(--pine)] text-2xl font-bold">
              {(profile.name ?? "R").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="eyebrow m-0">Profile</p>
            <h1 className="display my-1 text-[clamp(1.8rem,5vw,2.6rem)]">
              {profile.name ?? "Runner"}
            </h1>
            <p className="muted m-0 leading-relaxed">
              Account &amp; race baseline for your forecast
            </p>
          </div>
        </div>

        <section className="app-section">
          <SurfaceCard
            interactive={false}
            className="border-primary/35 shadow-[0_12px_28px_var(--accent-soft)]"
          >
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2 text-primary">
                <Route className="size-4" />
                <CardDescription className="eyebrow m-0 text-[0.7rem] tracking-[0.14em] text-primary">
                  Race baseline
                </CardDescription>
              </div>
              {baseline && baselineLabel ? (
                <>
                  <CardTitle className="display text-[clamp(1.6rem,4vw,2.2rem)]">
                    {baselineLabel}
                  </CardTitle>
                  <p className="mono m-0 text-3xl font-medium">
                    {formatDuration(baseline.timeSec)}
                  </p>
                </>
              ) : (
                <>
                  <CardTitle className="display text-xl">No baseline yet</CardTitle>
                  <CardDescription className="m-0 text-base leading-relaxed">
                    Add a recent race result so we can project your goal finish.
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {baseline ? (
                <p className="muted m-0 text-sm leading-relaxed">
                  Recorded {baseline.date}. This anchors your forecast until activity
                  sync is available.
                </p>
              ) : null}
              <Button asChild className="landing__btn h-10 rounded-xl font-bold">
                <Link href="/app/goal">
                  {baseline ? "Edit baseline" : "Add baseline"}
                </Link>
              </Button>
            </CardContent>
          </SurfaceCard>
        </section>
      </main>
    </AppShell>
  );
}
