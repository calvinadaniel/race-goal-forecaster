import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { goals, users } from "@/db/schema";
import { DISTANCES, type DistanceKey } from "@/lib/forecast/distances";
import { parsePlanStartMonday } from "@/lib/plan-start";

const goalSchema = z.object({
  distanceKey: z.enum(["5k", "10k", "half", "marathon"]),
  targetTimeSec: z.number().int().positive(),
  raceDate: z.string().min(8),
  intensity: z.enum(["conservative", "balanced", "aggressive"]),
  planStartMonday: z.string().nullable().optional(),
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
  const raceDate = new Date(body.raceDate);

  const [existing] = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, session.user.id))
    .limit(1);

  let planStartMonday: Date | null =
    existing?.planStartMonday ?? null;
  if (body.planStartMonday !== undefined) {
    const parsed = parsePlanStartMonday(body.planStartMonday, raceDate);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    planStartMonday = parsed.value;
  } else if (planStartMonday) {
    const y = planStartMonday.getFullYear();
    const m = String(planStartMonday.getMonth() + 1).padStart(2, "0");
    const d = String(planStartMonday.getDate()).padStart(2, "0");
    const recheck = parsePlanStartMonday(`${y}-${m}-${d}`, raceDate);
    if (!recheck.ok) {
      return NextResponse.json({ error: recheck.error }, { status: 400 });
    }
    planStartMonday = recheck.value;
  }

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
    raceDate,
    intensity: body.intensity,
    planStartMonday,
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
        planStartMonday: values.planStartMonday,
        manualBaseline: values.manualBaseline,
        updatedAt: values.updatedAt,
      },
    });

  return NextResponse.json({ ok: true });
}
