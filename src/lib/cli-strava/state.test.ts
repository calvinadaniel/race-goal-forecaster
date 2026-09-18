import { describe, expect, it } from "vitest";
import { signState, verifyState } from "./state";

const secret = "test-secret-for-hmac";
const payload = {
  redirect: "http://127.0.0.1:9/callback",
  nonce: "abc",
  exp: 2_000_000_000,
};

describe("cli oauth state", () => {
  it("round-trips a signed payload", () => {
    const token = signState(payload, secret);
    expect(verifyState(token, secret, 1_900_000_000)).toEqual(payload);
  });

  it("rejects tampering and expiry", () => {
    const token = signState(payload, secret);
    expect(verifyState(token + "x", secret, 1_900_000_000)).toBeNull();
    expect(verifyState(signState({ ...payload, exp: 10 }, secret), secret, 11)).toBeNull();
  });
});
