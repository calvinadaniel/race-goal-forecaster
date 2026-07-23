import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { goals, users } from "@/db/schema";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";

const goalSchema = z.object({
  distanceKey: z.enum(["5k", "10k", "half", "marathon"]),
  targetTimeSec: z.number().int().positive(),
  raceDate: z.string().min(8),
  intensity: z.enum(["conservative", "balanced", "aggressive"]),
  manualBaseline: z
    .object({
      distanceKey: z.enum(["5k", "10k", "half", "marathon"]),
      timeSec: z.number().int().positive(),
      date: z.string().min(8),
    })
    .nullable()
    .optional(),
  units: z.enum(["mi", "km"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, session.user.id))
    .limit(1);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({ goal: goal ?? null, units: user?.units ?? "mi" });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = goalSchema.parse(await req.json());
  const dist = DISTANCES[body.distanceKey as DistanceKey];
  const db = getDb();

  if (body.units) {
    await db
      .update(users)
      .set({ units: body.units })
      .where(eq(users.id, session.user.id));
  }

  const manualBaseline = body.manualBaseline
    ? {
        distanceKey: body.manualBaseline.distanceKey,
        distanceM: DISTANCES[body.manualBaseline.distanceKey].meters,
        timeSec: body.manualBaseline.timeSec,
        date: body.manualBaseline.date,
      }
    : null;

  const values = {
    userId: session.user.id,
    distanceKey: body.distanceKey,
    distanceM: dist.meters,
    targetTimeSec: body.targetTimeSec,
    raceDate: new Date(body.raceDate),
    intensity: body.intensity,
    manualBaseline,
    updatedAt: new Date(),
  };

  await db
    .insert(goals)
    .values({ id: crypto.randomUUID(), ...values })
    .onConflictDoUpdate({
      target: goals.userId,
      set: {
        distanceKey: values.distanceKey,
        distanceM: values.distanceM,
        targetTimeSec: values.targetTimeSec,
        raceDate: values.raceDate,
        intensity: values.intensity,
        manualBaseline: values.manualBaseline,
        updatedAt: values.updatedAt,
      },
    });

  return NextResponse.json({ ok: true });
}
