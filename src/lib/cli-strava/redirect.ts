const LOOPBACK = /^http:\/\/127\.0\.0\.1:(\d{1,5})\/callback$/;

export type LoopbackRedirect =
  | { ok: true; url: string; port: number }
  | { ok: false };

function portFromDigits(raw: string): number | null {
  if (!/^\d{1,5}$/.test(raw)) return null;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

export function parseLoopbackRedirect(
  raw: string | null,
): LoopbackRedirect {
  if (!raw) return { ok: false };
  const m = LOOPBACK.exec(raw);
  if (!m) return { ok: false };
  const port = portFromDigits(m[1]);
  if (port === null) return { ok: false };
  return { ok: true, url: raw, port };
}

export function loopbackRedirectFromPort(
  raw: string | null,
): LoopbackRedirect {
  if (!raw) return { ok: false };
  const port = portFromDigits(raw);
  if (port === null) return { ok: false };
  return { ok: true, url: `http://127.0.0.1:${port}/callback`, port };
}

export function parseStartLoopback(url: URL): LoopbackRedirect {
  const fromPort = loopbackRedirectFromPort(url.searchParams.get("port"));
  if (fromPort.ok) return fromPort;
  return parseLoopbackRedirect(url.searchParams.get("redirect"));
}
