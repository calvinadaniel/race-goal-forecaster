import NextAuth from "next-auth";
import Strava from "next-auth/providers/strava";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, users } from "@/db/schema";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
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
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || account.provider !== "strava") return false;
      const athleteId = String(account.providerAccountId);
      const db = getDb();

      const existing = await db
        .select()
        .from(accounts)
        .where(eq(accounts.providerAccountId, athleteId))
        .limit(1);

      let userId: string;
      if (existing[0]) {
        userId = existing[0].userId;
        await db
          .update(accounts)
          .set({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            scope: account.scope,
            token_type: account.token_type,
          })
          .where(eq(accounts.providerAccountId, athleteId));
      } else {
        const [created] = await db
          .insert(users)
          .values({
            name: profile?.name ?? "Runner",
            image: (profile as { image?: string } | undefined)?.image ?? null,
            stravaAthleteId: athleteId,
            units: "mi",
          })
          .returning();
        userId = created.id;
        await db.insert(accounts).values({
          userId,
          type: "oauth",
          provider: "strava",
          providerAccountId: athleteId,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
        });
      }

      (account as { userId?: string }).userId = userId;
      return true;
    },
    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        const db = getDb();
        const row = await db
          .select()
          .from(accounts)
          .where(eq(accounts.providerAccountId, String(account.providerAccountId)))
          .limit(1);
        if (row[0]) {
          token.userId = row[0].userId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  trustHost: true,
});
