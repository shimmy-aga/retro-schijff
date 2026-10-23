import { NextResponse } from "next/server";
import { getBets, addBet } from "@/lib/store";
import { quoteExisting } from "@/lib/odds";

export async function GET() {
  const bets = getBets();
  const enriched = bets.map((b: any) => {
    const q = quoteExisting(b.market, bets, b.outcome, b.wager);
    return { ...b, liveOdds: q.odds, liveValue: q.value, liveChance: q.chance, marketPool: q.pool };
  });
  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  const result = addBet(body);
  if (result && typeof result === "object" && "error" in result) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
