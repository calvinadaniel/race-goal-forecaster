"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { TermHelpProvider } from "@/components/TermHelpProvider";
import { ForecastProvider } from "@/lib/use-forecast";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <ForecastProvider>
      <TermHelpProvider>
        <AppShell>{children}</AppShell>
      </TermHelpProvider>
    </ForecastProvider>
  );
}
