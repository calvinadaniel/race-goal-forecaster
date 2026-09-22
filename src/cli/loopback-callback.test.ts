import { describe, expect, it } from "vitest";
import { parseLoopbackCallbackRequest } from "./loopback-callback";

describe("parseLoopbackCallbackRequest", () => {
  it("accepts a ticketed callback even when Sec-Fetch-Site is cross-site", () => {
    expect(
      parseLoopbackCallbackRequest({
        url: "/callback?ticket=t1&nonce=n1",
        secFetchSite: "cross-site",
      }),
    ).toEqual({ ok: true, ticket: "t1", nonce: "n1" });
  });

  it("rejects a missing ticket, missing nonce, or non-callback path", () => {
    expect(
      parseLoopbackCallbackRequest({ url: "/callback?nonce=n1" }).ok,
    ).toBe(false);
    expect(
      parseLoopbackCallbackRequest({ url: "/callback?ticket=t1" }).ok,
    ).toBe(false);
    expect(
      parseLoopbackCallbackRequest({
        url: "/favicon.ico?ticket=t1&nonce=n1",
      }).ok,
    ).toBe(false);
  });
});
