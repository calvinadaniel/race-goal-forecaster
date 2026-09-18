import { NextResponse } from "next/server";
import { ticketStore } from "@/lib/cli-strava/tickets";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Missing ticket" }, { status: 400 });
  }

  const ticket =
    typeof body === "object" &&
    body !== null &&
    "ticket" in body &&
    typeof body.ticket === "string"
      ? body.ticket
      : null;
  if (!ticket) {
    return NextResponse.json({ error: "Missing ticket" }, { status: 400 });
  }

  const payload = await ticketStore.redeemTicket(ticket);
  if (!payload) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
