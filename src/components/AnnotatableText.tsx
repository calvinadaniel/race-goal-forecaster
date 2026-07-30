"use client";

import { annotateText } from "@/lib/training/annotate";
import { useTermHelp } from "@/components/TermHelpProvider";

export function AnnotatableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { openTerm } = useTermHelp();
  const parts = annotateText(text);

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={`${p.type}-${i}-${p.value}`}>{p.value}</span>
        ) : (
          <button
            key={`${p.type}-${i}-${p.value}`}
            type="button"
            aria-label={`What is ${p.value}?`}
            className="border-0 bg-transparent p-0 underline decoration-dotted underline-offset-2 text-primary cursor-pointer"
            onClick={() => openTerm(p.termId)}
          >
            {p.value}
          </button>
        ),
      )}
    </span>
  );
}
