import { GLOSSARY } from "./glossary";

export type AnnotatedSegment =
  | { type: "text"; value: string }
  | { type: "term"; value: string; termId: string };

type Alias = { alias: string; termId: string };

function buildAliases(): Alias[] {
  const list: Alias[] = [];
  for (const term of GLOSSARY) {
    const aliases = term.aliases?.length ? term.aliases : [term.label];
    for (const alias of aliases) {
      if (alias.trim()) list.push({ alias, termId: term.id });
    }
  }
  // Longest first so "race-pace" wins over "pace"
  list.sort((a, b) => b.alias.length - a.alias.length);
  return list;
}

const ALIASES = buildAliases();

function isWordBoundary(text: string, index: number): boolean {
  return index <= 0 || index >= text.length || /[^A-Za-z]/.test(text[index]!);
}

export function annotateText(text: string): AnnotatedSegment[] {
  if (!text) return [];
  const parts: AnnotatedSegment[] = [];
  let i = 0;
  while (i < text.length) {
    let hit: { end: number; alias: string; termId: string } | null = null;
    const slice = text.slice(i);
    for (const { alias, termId } of ALIASES) {
      if (!slice.toLowerCase().startsWith(alias.toLowerCase())) continue;
      const beforeOk = isWordBoundary(text, i - 1);
      const afterIdx = i + alias.length;
      const afterOk = isWordBoundary(text, afterIdx);
      if (beforeOk && afterOk) {
        hit = {
          end: afterIdx,
          alias: text.slice(i, afterIdx),
          termId,
        };
        break;
      }
    }
    if (hit) {
      parts.push({ type: "term", value: hit.alias, termId: hit.termId });
      i = hit.end;
    } else {
      const last = parts[parts.length - 1];
      if (last && last.type === "text") {
        last.value += text[i];
      } else {
        parts.push({ type: "text", value: text[i]! });
      }
      i += 1;
    }
  }
  return parts;
}
