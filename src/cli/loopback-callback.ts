export function parseLoopbackCallbackRequest(args: {
  url: string;
  secFetchSite?: string | string[];
}): { ok: true; ticket: string; nonce: string } | { ok: false } {
  const url = new URL(args.url, "http://127.0.0.1");
  const ticket = url.searchParams.get("ticket");
  const nonce = url.searchParams.get("nonce");
  if (url.pathname !== "/callback" || !ticket || !nonce) {
    return { ok: false };
  }
  return { ok: true, ticket, nonce };
}
