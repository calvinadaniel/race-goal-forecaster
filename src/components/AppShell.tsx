"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  {
    href: "/app/training",
    label: "Training",
    match: (p: string) => p.startsWith("/app/training"),
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16M7 16l3-8 3 5 2-3 2 6" />
        <circle cx="7" cy="16" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="17" cy="16" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/app/forecast",
    label: "Forecast",
    match: (p: string) => p.startsWith("/app/forecast"),
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    ),
  },
  {
    href: "/app/profile",
    label: "Profile",
    match: (p: string) => p.startsWith("/app/profile"),
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
      </svg>
    ),
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
        <Link href="/app/forecast" className="app-shell__logo display">
          Race Goal <span>Forecaster</span>
        </Link>
        <div className="app-shell__actions">
          {headerAction}
          {showEditGoal && (
            <Link className="btn btn-primary landing__btn" href="/app/goal">
              Edit goal
            </Link>
          )}
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
              className={`app-tab${active ? " app-tab--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
