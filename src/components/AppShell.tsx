"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Flag, Target, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/app/training",
    label: "Training",
    match: (p: string) => p.startsWith("/app/training"),
    icon: Activity,
  },
  {
    href: "/app/forecast",
    label: "Forecast",
    match: (p: string) => p.startsWith("/app/forecast"),
    icon: Target,
  },
  {
    href: "/app/profile",
    label: "Profile",
    match: (p: string) => p.startsWith("/app/profile"),
    icon: UserRound,
  },
] as const;

export function AppShell({
  children,
  showEditGoal = true,
  headerAction,
}: {
  children: ReactNode;
  showEditGoal?: boolean;
  headerAction?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="app-shell__header container">
        <BrandLogo href="/app/forecast" />
        <div className="app-shell__actions">
          {headerAction}
          {showEditGoal && (
            <Button asChild className="landing__btn h-10 rounded-xl px-4 font-bold">
              <Link href="/app/goal">
                <Flag className="size-4" />
                Edit goal
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="app-shell__body">{children}</div>

      <nav className="app-tabbar" aria-label="Primary">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("app-tab", active && "app-tab--active")}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.9} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
