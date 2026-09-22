"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SurfaceCard({
  className,
  interactive = false,
  children,
  ...props
}: React.ComponentProps<typeof Card> & { interactive?: boolean }) {
  return (
    <Card
      className={cn(
        "border border-border bg-card shadow-none ring-0",
        interactive && "surface-interactive",
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
        <CardDescription className="m-0 text-sm">{label}</CardDescription>
        <CardTitle className="mono kpi__value text-2xl font-medium">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        {children}
        {hint ? <p className="kpi__hint muted">{hint}</p> : null}
      </CardContent>
    </SurfaceCard>
  );
}
