import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const linked = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  const providers = linked.map((a) => a.provider);
  return NextResponse.json({
    strava: providers.includes("strava"),
    google: providers.includes("google"),
    providers,
  });
}

/** Disconnect Strava only — keeps the TruePace account. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { provider?: string };
  const provider = body.provider ?? "strava";
  if (provider !== "strava") {
    return NextResponse.json({ error: "Only Strava disconnect is supported" }, { status: 400 });
  }

  const db = getDb();
  const linked = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  if (linked.length <= 1 && linked[0]?.provider === "strava") {
    return NextResponse.json(
      {
        error:
          "Cannot disconnect your only sign-in method. Log out instead, or link Google first.",
      },
      { status: 400 },
    );
  }

  await db
    .delete(accounts)
    .where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "strava"),
      ),
    );

  return NextResponse.json({ ok: true, provider: "strava" });
}
