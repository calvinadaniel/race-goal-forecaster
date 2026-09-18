export function hasActivityReadAll(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope
    .split(/[,\s]+/)
    .filter(Boolean)
    .includes("activity:read_all");
}
