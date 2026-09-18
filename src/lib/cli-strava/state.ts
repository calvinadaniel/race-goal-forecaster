import { createHmac, timingSafeEqual } from "node:crypto";

export type CliOAuthState = {
  redirect: string;
  nonce: string;
  exp: number;
};

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function hmac(secret: string, data: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

export function signState(payload: CliOAuthState, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(secret, body)}`;
}

export function verifyState(
  state: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): CliOAuthState | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmac(secret, body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CliOAuthState;
    if (!json.redirect || !json.nonce || typeof json.exp !== "number") return null;
    if (json.exp <= nowSec) return null;
    return json;
  } catch {
    return null;
  }
}
