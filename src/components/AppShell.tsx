"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SHORT_DISTANCE, formatShortDate } from "@/lib/today-session";
import { useForecastData } from "@/lib/use-forecast";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/app",
    label: "Today",
    match: (p: string) => p === "/app" || p === "/app/",
  },
  {
    href: "/app/training",
    label: "Plan",
    match: (p: string) => p.startsWith("/app/training"),
  },
  {
    href: "/app/forecast",
    label: "Forecast",
    match: (p: string) => p.startsWith("/app/forecast"),
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useForecastData();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const dist =
    data && (SHORT_DISTANCE[data.goal.distanceKey] ?? data.goal.distanceKey);
  const photoSrc =
    data && !avatarFailed && data.profile.image
      ? data.profile.image
      : data && !avatarFailed && data.profile.hasPhoto
        ? "/api/avatar"
        : undefined;
  const initial = (data?.profile.name ?? "R").slice(0, 1).toUpperCase();

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner container">
          <BrandLogo href="/app" />
          <nav className="app-nav" aria-label="Primary">
            {TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn("app-nav__link", active && "app-nav__link--active")}
                  aria-current={active ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <div className="app-shell__actions">
            {data ? (
              <Link
                href="/app/goal"
                className="race-chip"
                title="Edit goal"
              >
                <span>{dist}</span>
                <span className="race-chip__date">
                  {formatShortDate(data.goal.raceDate)}
                </span>
              </Link>
            ) : (
              <Skeleton className="h-8 w-28" />
            )}
            <Link
              href="/app/profile"
              className="app-avatar-link"
              aria-label="Profile"
            >
              <Avatar className="size-8">
                {photoSrc ? (
                  <AvatarImage
                    key={photoSrc}
                    src={photoSrc}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : null}
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <div className="app-shell__body">{children}</div>

      <nav className="app-tabbar" aria-label="Primary">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("app-tab", active && "app-tab--active")}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
