"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionHeading({
  icon: Icon,
  title,
  tone = "accent",
}: {
  icon: LucideIcon;
  title: string;
  tone?: "accent" | "pine";
}) {
  return (
    <h2 className="display section-title ui-section-head">
      <span className={cn("ui-section-icon", tone === "pine" && "ui-section-icon--pine")}>
        <Icon className="size-4" />
      </span>
      {title}
    </h2>
  );
}

export function SurfaceCard({
  className,
  interactive = true,
  children,
  ...props
}: React.ComponentProps<typeof Card> & { interactive?: boolean }) {
  return (
    <Card
      className={cn(
        "border border-border/70 bg-card shadow-none ring-0",
        interactive && "ui-lift cursor-default",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <SurfaceCard className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <CardDescription className="eyebrow m-0 text-[0.7rem] tracking-[0.14em] text-[var(--accent)]">
          {label}
        </CardDescription>
        <CardTitle className="mono kpi__value text-2xl font-medium">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        {children}
        {hint ? <p className="kpi__hint muted">{hint}</p> : null}
      </CardContent>
    </SurfaceCard>
  );
}
