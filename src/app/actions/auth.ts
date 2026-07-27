"use server";

import { cookies } from "next/headers";
import { auth, LINK_STRAVA_COOKIE, signIn, signOut } from "@/auth";

export async function logOut() {
  await signOut({ redirectTo: "/" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/app/forecast" });
}

/** Secondary CTA for existing Strava-only testers. */
export async function signInWithStrava() {
  await signIn("strava", { redirectTo: "/app/forecast" });
}

/** Link Strava to the currently signed-in TruePace user. */
export async function connectStrava() {
  const session = await auth();
  if (!session?.user?.id) {
    await signIn("strava", { redirectTo: "/onboarding" });
    return;
  }
  const jar = await cookies();
  jar.set(LINK_STRAVA_COOKIE, session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  await signIn("strava", { redirectTo: "/app/profile" });
}
