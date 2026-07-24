"use client";

import { useState } from "react";
import {
  Footprints,
  Gauge,
  Medal,
  RefreshCw,
  Timer,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, SectionHeading, SurfaceCard } from "@/components/ui-surface";
import { formatDuration } from "@/lib/units";
import { useForecastData } from "@/lib/use-forecast";
import { cn } from "@/lib/utils";

function formatPace(secPerMi: number | null): string {
  if (secPerMi == null || !Number.isFinite(secPerMi)) return "—";
  const m = Math.floor(secPerMi / 60);
  const s = Math.round(secPerMi % 60);
  return `${m}:${String(s).padStart(2, "0")}/mi`;
}

export default function ProfilePage() {
  const { data, units, error, busy, refresh } = useForecastData();
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
          <div className="profile-grid">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </main>
      </AppShell>
    );
  }

  const { profile } = data;
  const ytdDisplay =
    units === "km"
      ? `${(profile.ytdMiles * 1.60934).toFixed(0)} km`
      : `${profile.ytdMiles.toFixed(0)} mi`;
  const showPhoto = (profile.hasPhoto || Boolean(profile.image)) && !avatarFailed;

  return (
    <AppShell
      headerAction={
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
      }
    >
      <main className="container app-page">
        <div className="profile-hero">
          <Avatar className="profile-hero__avatar size-[72px] border border-border shadow-sm">
            {showPhoto ? (
              <AvatarImage
                key={profile.image ?? "avatar"}
                src="/api/avatar"
                alt=""
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
              {profile.year} stats from synced Strava runs
            </p>
          </div>
        </div>

        <div className="profile-grid">
          <KpiCard label="YTD mileage" value={ytdDisplay}>
            <div className="flex items-center gap-2 text-[var(--pine)]">
              <Footprints className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Distance</span>
            </div>
          </KpiCard>
          <KpiCard label="Average pace" value={formatPace(profile.avgPaceSecPerMi)}>
            <div className="flex items-center gap-2 text-primary">
              <Timer className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Pace</span>
            </div>
          </KpiCard>
          <SurfaceCard className="gap-2 py-4">
            <CardHeader className="px-4 pb-0">
              <CardDescription className="eyebrow m-0 text-[0.7rem] tracking-[0.14em] text-[var(--accent)]">
                Races completed
              </CardDescription>
              <CardTitle className="mono text-3xl font-medium">
                {profile.racesCompleted}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pt-0">
              <div className="flex items-center gap-2 text-primary">
                <Medal className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Strava races</span>
              </div>
              <p className="muted m-0 text-sm">
                Marked as race in Strava (not “wins” — we don’t have place data)
              </p>
            </CardContent>
          </SurfaceCard>
          <KpiCard label="Activities" value={String(profile.activityCount)}>
            <div className="flex items-center gap-2 text-[var(--pine)]">
              <Gauge className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">YTD runs</span>
            </div>
          </KpiCard>
        </div>

        {data.strip.topEfforts.length > 0 && (
          <section className="app-section">
            <SectionHeading icon={Trophy} title="Recent activities" />
            <SurfaceCard interactive={false}>
              <CardContent className="space-y-0 px-0 py-0">
                {data.strip.topEfforts.map((e, i) => (
                  <div key={e.id}>
                    {i > 0 ? <Separator /> : null}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/60">
                      <div>
                        <p className="m-0 font-semibold">{e.name || "Run"}</p>
                        <p className="mono muted m-0 text-sm">{e.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono text-sm">
                          {formatDuration(e.movingTimeSec)}
                        </span>
                        {e.isRace ? <Badge className="rounded-full">Race</Badge> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </SurfaceCard>
          </section>
        )}
      </main>
    </AppShell>
  );
}
