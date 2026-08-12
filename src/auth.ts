import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Strava from "next-auth/providers/strava";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";
import {
  ensureDevPreviewUser,
  isDevPreviewEnabled,
} from "@/lib/dev-preview";
import { normalizeAthleteImageUrl } from "@/lib/strava";

export const LINK_STRAVA_COOKIE = "truepace_link_user_id";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

function imageFromAuthProfile(
  profile: Record<string, unknown> | undefined,
): string | null {
  return normalizeAthleteImageUrl(
    typeof profile?.image === "string" ? profile.image : null,
    typeof profile?.picture === "string" ? profile.picture : null,
    typeof profile?.profile === "string" ? profile.profile : null,
    typeof profile?.profile_medium === "string" ? profile.profile_medium : null,
  );
}

async function upsertGoogleUser(
  account: {
    providerAccountId: string;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
    token_type?: string | null;
    scope?: string | null;
  },
  profile: { name?: string | null; email?: string | null } & Record<
    string,
    unknown
  >,
): Promise<string> {
  const db = getDb();
  const googleId = String(account.providerAccountId);
  const existing = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, googleId)),
    )
    .limit(1);

  const image = imageFromAuthProfile(profile);
  const name = profile.name ?? "Runner";
  const email = typeof profile.email === "string" ? profile.email : null;

  if (existing[0]) {
    const userId = existing[0].userId;
    await db
      .update(accounts)
      .set({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at,
        scope: account.scope,
        token_type: account.token_type,
      })
      .where(
        and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, googleId)),
      );
    await db
      .update(users)
      .set({
        ...(image ? { image } : {}),
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      })
      .where(eq(users.id, userId));
    return userId;
  }

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      image,
      units: "mi",
    })
    .returning();

  await db.insert(accounts).values({
    userId: created.id,
    type: "oauth",
    provider: "google",
    providerAccountId: googleId,
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
    token_type: account.token_type,
    scope: account.scope,
  });

  return created.id;
}

async function upsertStravaAccount(
  account: {
    providerAccountId: string;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
    token_type?: string | null;
    scope?: string | null;
  },
  profile: { name?: string | null } & Record<string, unknown>,
  linkUserId: string | null,
): Promise<string> {
  const db = getDb();
  const athleteId = String(account.providerAccountId);
  const existing = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.provider, "strava"), eq(accounts.providerAccountId, athleteId)),
    )
    .limit(1);

  const image = imageFromAuthProfile(profile);
  const name = profile.name ?? null;
  const tokenFields = {
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
    scope: account.scope,
    token_type: account.token_type,
  };

  // Prefer attaching to the logged-in TruePace user when linking.
  if (linkUserId) {
    if (existing[0]) {
      await db
        .update(accounts)
        .set({
          ...tokenFields,
          userId: linkUserId,
        })
        .where(
          and(
            eq(accounts.provider, "strava"),
            eq(accounts.providerAccountId, athleteId),
          ),
        );
    } else {
      await db.insert(accounts).values({
        userId: linkUserId,
        type: "oauth",
        provider: "strava",
        providerAccountId: athleteId,
        ...tokenFields,
      });
    }
    await db
      .update(users)
      .set({
        stravaAthleteId: athleteId,
        ...(image ? { image } : {}),
        ...(name ? { name } : {}),
      })
      .where(eq(users.id, linkUserId));
    return linkUserId;
  }

  // Standalone Strava sign-in (existing testers / secondary CTA).
  if (existing[0]) {
    const userId = existing[0].userId;
    await db
      .update(accounts)
      .set(tokenFields)
      .where(
        and(
          eq(accounts.provider, "strava"),
          eq(accounts.providerAccountId, athleteId),
        ),
      );
    await db
      .update(users)
      .set({
        ...(image ? { image } : {}),
        ...(name ? { name } : {}),
      })
      .where(eq(users.id, userId));
    return userId;
  }

  const [created] = await db
    .insert(users)
    .values({
      name: name ?? "Runner",
      image,
      stravaAthleteId: athleteId,
      units: "mi",
    })
    .returning();

  await db.insert(accounts).values({
    userId: created.id,
    type: "oauth",
    provider: "strava",
    providerAccountId: athleteId,
    ...tokenFields,
  });

  return created.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Strava({
      clientId: process.env.AUTH_STRAVA_ID!,
      clientSecret: process.env.AUTH_STRAVA_SECRET!,
      authorization: {
        params: {
          scope: "read,activity:read_all",
          approval_prompt: "auto",
        },
      },
    }),
    ...(isDevPreviewEnabled()
      ? [
          Credentials({
            id: "dev-preview",
            name: "Dev preview",
            credentials: {
              preview: { label: "Preview", type: "text" },
            },
            async authorize() {
              if (!isDevPreviewEnabled()) return null;
              return ensureDevPreviewUser();
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile, user }) {
      // Local Credentials preview — account may be null or id "dev-preview".
      if (
        isDevPreviewEnabled() &&
        user?.id &&
        (!account || account.provider === "dev-preview")
      ) {
        return true;
      }

      if (!account) return false;

      if (account.provider !== "google" && account.provider !== "strava") {
        return false;
      }

      const raw = (profile ?? {}) as Record<string, unknown> & {
        name?: string | null;
        email?: string | null;
      };

      let userId: string;
      if (account.provider === "google") {
        userId = await upsertGoogleUser(account, raw);
      } else {
        const jar = await cookies();
        const linkUserId = jar.get(LINK_STRAVA_COOKIE)?.value ?? null;
        userId = await upsertStravaAccount(account, raw, linkUserId);
        if (linkUserId) {
          jar.delete(LINK_STRAVA_COOKIE);
        }
      }

      (account as { userId?: string }).userId = userId;
      return true;
    },
    async jwt({ token, account, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      if (account?.providerAccountId) {
        const db = getDb();
        const row = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.provider, account.provider),
              eq(
                accounts.providerAccountId,
                String(account.providerAccountId),
              ),
            ),
          )
          .limit(1);
        if (row[0]) {
          token.userId = row[0].userId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        const userId = token.userId as string;
        session.user.id = userId;
        const db = getDb();
        const [user] = await db
          .select({
            name: users.name,
            image: users.image,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (user) {
          session.user.name = user.name;
          if (user.email) session.user.email = user.email;
          session.user.image = normalizeAthleteImageUrl(user.image);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  trustHost: true,
});
