const LOOPBACK = /^http:\/\/127\.0\.0\.1:(\d{1,5})\/callback$/;

export function parseLoopbackRedirect(
  raw: string | null,
): { ok: true; url: string; port: number } | { ok: false } {
  if (!raw) return { ok: false };
  const m = LOOPBACK.exec(raw);
  if (!m) return { ok: false };
  const port = Number(m[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false };
  return { ok: true, url: raw, port };
}
