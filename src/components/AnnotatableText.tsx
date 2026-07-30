"use client";

import { useState } from "react";
import { annotateText } from "@/lib/training/annotate";
import { TermHelpSheet } from "@/components/TermHelpSheet";

export function AnnotatableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [termId, setTermId] = useState<string | null>(null);
  const parts = annotateText(text);

  return (
    <>
      <span className={className}>
        {parts.map((p, i) =>
          p.type === "text" ? (
            <span key={`${p.type}-${i}-${p.value}`}>{p.value}</span>
          ) : (
            <button
              key={`${p.type}-${i}-${p.value}`}
              type="button"
              aria-label={`What is ${p.value}?`}
              className="border-0 bg-transparent p-0 text-inherit underline decoration-dotted underline-offset-2 text-primary cursor-pointer"
              onClick={() => setTermId(p.termId)}
            >
              {p.value}
            </button>
          ),
        )}
      </span>
      <TermHelpSheet
        termId={termId}
        open={Boolean(termId)}
        onOpenChange={(o) => {
          if (!o) setTermId(null);
        }}
      />
    </>
  );
}
