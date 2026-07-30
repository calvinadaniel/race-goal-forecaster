"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TermHelpSheet } from "@/components/TermHelpSheet";

type TermHelpContextValue = {
  openTerm: (termId: string) => void;
};

const TermHelpContext = createContext<TermHelpContextValue | null>(null);

export function TermHelpProvider({ children }: { children: ReactNode }) {
  const [termId, setTermId] = useState<string | null>(null);
  const openTerm = useCallback((id: string) => setTermId(id), []);
  const value = useMemo(() => ({ openTerm }), [openTerm]);

  return (
    <TermHelpContext.Provider value={value}>
      {children}
      <TermHelpSheet
        termId={termId}
        open={Boolean(termId)}
        onOpenChange={(open) => {
          if (!open) setTermId(null);
        }}
      />
    </TermHelpContext.Provider>
  );
}

export function useTermHelp(): TermHelpContextValue {
  const ctx = useContext(TermHelpContext);
  if (!ctx) {
    throw new Error("useTermHelp must be used within TermHelpProvider");
  }
  return ctx;
}
