"use client";

import { useState } from "react";
import Link from "next/link";
import { logOut } from "@/app/actions/auth";
import { StravaConnectionCard } from "@/components/StravaConnectionCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceCard } from "@/components/ui-surface";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { formatDuration } from "@/lib/units";
import { useForecastData } from "@/lib/use-forecast";

export default function ProfilePage() {
  const { data, error, refresh } = useForecastData();
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (error) {
    return (
      <main className="container app-page">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container app-page space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-[72px] rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-36" />
      </main>
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
    <main className="container app-page">
      <div className="profile-hero">
        <Avatar className="profile-hero__avatar size-[72px]">
          {photoSrc ? (
            <AvatarImage
              key={photoSrc}
              src={photoSrc}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
            />
          ) : null}
          <AvatarFallback className="profile-hero__avatar--placeholder">
            {(profile.name ?? "R").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="display my-1 text-[1.85rem] leading-tight">
            {profile.name ?? "Runner"}
          </h1>
          <p className="muted m-0 leading-relaxed">
            Account, baseline, and connections
          </p>
        </div>
      </div>

      <section className="app-section">
        <h2 className="section-title">Race baseline</h2>
        <SurfaceCard interactive={false}>
          <CardHeader className="gap-2">
            {baseline && baselineLabel ? (
              <>
                <CardTitle className="display text-[1.6rem]">
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
                  Add a recent race so the forecast has something to project from.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {baseline ? (
              <p className="muted m-0 text-sm leading-relaxed">
                Recorded {baseline.date}. This anchors your forecast until
                activity sync is available.
              </p>
            ) : null}
            <Button asChild>
              <Link href="/app/goal">
                {baseline ? "Edit baseline" : "Add baseline"}
              </Link>
            </Button>
          </CardContent>
        </SurfaceCard>
      </section>

      <StravaConnectionCard onChanged={() => void refresh()} />

      <form action={logOut} className="mt-8">
        <Button variant="outline" type="submit">
          Log out
        </Button>
      </form>
    </main>
  );
}
