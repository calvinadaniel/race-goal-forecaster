"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTerm } from "@/lib/training/glossary";

export function TermHelpSheet({
  termId,
  open,
  onOpenChange,
}: {
  termId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const term = termId ? getTerm(termId) : undefined;
  // Avoid mounting Dialog/portal while closed — prevents SSR/client DOM mismatches
  // when many annotatable strings are on the page.
  if (!open || !termId) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-2xl">
            {term?.label ?? "Term"}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-foreground">
            {term?.short ?? "No definition available."}
          </DialogDescription>
        </DialogHeader>
        {term?.feel ? (
          <p className="muted m-0 text-sm leading-relaxed">
            <span className="font-semibold text-foreground">Feel: </span>
            {term.feel}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
