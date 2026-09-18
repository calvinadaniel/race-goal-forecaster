import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();

vi.mock("@/auth", () => ({
  signIn,
  signOut: vi.fn(),
  auth: vi.fn(),
  LINK_STRAVA_COOKIE: "truepace_link_user_id",
}));

vi.mock("@/lib/dev-preview", () => ({
  isDevPreviewEnabled: () => false,
}));

describe("signInWithStrava", () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  it("starts Strava OAuth and sends the runner to onboarding", async () => {
    const { signInWithStrava } = await import("./auth");
    await signInWithStrava();
    expect(signIn).toHaveBeenCalledWith("strava", {
      redirectTo: "/onboarding",
    });
  });
});
