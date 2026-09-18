import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { cliStravaTickets, type CliStravaTicketPayload } from "@/db/schema";

export const TICKET_TTL_MS = 2 * 60 * 1000;

export function newTicketId(): string {
  return randomBytes(24).toString("base64url");
}

export type TicketStore = {
  insertTicket(payload: CliStravaTicketPayload, now?: Date): Promise<string>;
  redeemTicket(id: string, now?: Date): Promise<CliStravaTicketPayload | null>;
};

function expiresAt(now: Date): Date {
  return new Date(now.getTime() + TICKET_TTL_MS);
}

export function createDbTicketStore(): TicketStore {
  return {
    async insertTicket(payload, now = new Date()) {
      const db = getDb();
      await db.delete(cliStravaTickets).where(lt(cliStravaTickets.expiresAt, now));
      const id = newTicketId();
      await db.insert(cliStravaTickets).values({
        id,
        payload,
        expiresAt: expiresAt(now),
        createdAt: now,
      });
      return id;
    },
    async redeemTicket(id, now = new Date()) {
      const db = getDb();
      const [row] = await db
        .delete(cliStravaTickets)
        .where(eq(cliStravaTickets.id, id))
        .returning();
      if (!row) return null;
      if (row.expiresAt.getTime() <= now.getTime()) return null;
      return row.payload;
    },
  };
}

export function createMemoryTicketStore(): TicketStore {
  const rows = new Map<string, { payload: CliStravaTicketPayload; expiresAt: Date }>();
  return {
    async insertTicket(payload, now = new Date()) {
      const id = newTicketId();
      rows.set(id, { payload, expiresAt: expiresAt(now) });
      return id;
    },
    async redeemTicket(id, now = new Date()) {
      const row = rows.get(id);
      if (!row) return null;
      rows.delete(id);
      if (row.expiresAt.getTime() <= now.getTime()) return null;
      return row.payload;
    },
  };
}

export const ticketStore: TicketStore = createDbTicketStore();
