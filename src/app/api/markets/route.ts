import { NextResponse } from "next/server";
import { getBets } from "@/lib/store";
import {
  marketQuote,
  maxStakeFor,
  minStakeFor,
  MARKET_LABEL,
  MARKET_KEYS,
} from "@/lib/odds";

const DESC: Record<string, string> = {
  date: "Exacte dag",
  weight: "Binnen 200g",
  length: "Binnen 1 cm",
  name: "Exacte naam",
  hair: "Juiste kleur",
  eyes: "Juiste kleur",
};

export async function GET() {
  const bets = getBets();

  const markets = MARKET_KEYS.map((key) => {
    const marketBets = bets.filter((b: any) => b.market === key);
    const q = marketQuote(key, bets);
    return {
      key,
      label: MARKET_LABEL[key],
      desc: DESC[key],
      odds: q.odds,
      chance: q.chance,
      implied: q.implied,
      pool: q.pool,
      betCount: marketBets.length,
      distinctOutcomes: q.distinct,
      maxStake: maxStakeFor(key, bets),
      minStake: minStakeFor(key, bets),
    };
  });
  return NextResponse.json(markets);
}
