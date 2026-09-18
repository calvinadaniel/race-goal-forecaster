import { describe, expect, it } from "vitest";
import {
  TICKET_TTL_MS,
  createMemoryTicketStore,
} from "./tickets";

const payload = {
  access_token: "a",
  refresh_token: "r",
  expires_at: 9,
  scope: "activity:read_all",
  athlete: { id: 1, firstname: "Ada" },
};

describe("cli tickets", () => {
  it("redeems once then fails", async () => {
    const store = createMemoryTicketStore();
    const id = await store.insertTicket(payload);
    expect(await store.redeemTicket(id)).toEqual(payload);
    expect(await store.redeemTicket(id)).toBeNull();
  });

  it("rejects expired tickets", async () => {
    const store = createMemoryTicketStore();
    const now = new Date("2026-09-17T00:00:00Z");
    const id = await store.insertTicket(payload, now);
    const later = new Date(now.getTime() + TICKET_TTL_MS + 1000);
    expect(await store.redeemTicket(id, later)).toBeNull();
  });

  it("unknown id is null", async () => {
    const store = createMemoryTicketStore();
    expect(await store.redeemTicket("nope")).toBeNull();
  });
});
