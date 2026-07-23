import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  units: text("units").notNull().default("mi"), // mi | km
  stravaAthleteId: text("strava_athlete_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const activities = pgTable("activities", {
  id: text("id").primaryKey(), // strava activity id as string
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("strava"),
  name: text("name"),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  distanceM: real("distance_m").notNull(),
  movingTimeSec: integer("moving_time_sec").notNull(),
  avgHr: real("avg_hr"),
  sufferScore: integer("suffer_score"),
  isRace: boolean("is_race").notNull().default(false),
  workoutType: integer("workout_type"),
});

export const goals = pgTable("goals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  distanceKey: text("distance_key").notNull(), // 5k | 10k | half | marathon
  distanceM: real("distance_m").notNull(),
  targetTimeSec: integer("target_time_sec").notNull(),
  raceDate: timestamp("race_date", { mode: "date" }).notNull(),
  intensity: text("intensity").notNull().default("balanced"), // conservative | balanced | aggressive
  manualBaseline: jsonb("manual_baseline").$type<{
    distanceKey: string;
    distanceM: number;
    timeSec: number;
    date: string;
  } | null>(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
