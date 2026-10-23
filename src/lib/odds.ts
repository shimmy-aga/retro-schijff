export const MARKET_LABEL: Record<string, string> = {
  date: "Geboortedatum",
  weight: "Gewicht",
  length: "Lengte",
  name: "Naam",
  hair: "Haarkleur",
  eyes: "Oogkleur",
};

export const MARKET_KEYS = Object.keys(MARKET_LABEL);

/**
 * THE MECHANIC (pool = liability, no house funds)
 * ==============================================
 * This is a pooled market, like a real tote / pari-mutuel pool. Every stake
 * goes into one pool per market. There is no house money and no house
 * liability: the pool IS the liability.
 *
 *   price (odds)  = pool / money on this outcome
 *   your payout   = your stake x price
 *
 * Because the price is a ratio of the pool, it moves continuously as more
 * money lands on an outcome - there is no locked price, the final price is
 * simply the pool at the moment the market closes. Winners split the pot
 * pro rata, so a bigger ticket means a bigger claim on the pot.
 *
 * The platform's published line only matters while the pool is thin: it is
 * the price the platform quotes for an outcome nobody has backed yet. Once
 * money is in the pool, the pool sets the price.
 */

/** Largest single stake. */
export const MAX_STAKE_PER_BET = 100;
/** A single bet may be as large as the current pool. */
export const MIN_STAKE_BASE = 5;
/** Minimum ticket is ~40% of the pool, rounded to nearest 5, at least 5. */
export const MIN_STAKE_SHARE_OF_POOL = 0.40;
/** Longest price that is ever quoted. */
export const MAX_ODDS = 100;
/** Progressive haircut: fraction of pool redistributed from winners to losers. */
export const HAIRCUT_ALPHA = 0.50;

/** Multiplier m(x) = 1 - alpha*(1-x)^3, where x = winning stake / pool. */
export function haircutMultiplier(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  const m = 1 - HAIRCUT_ALPHA * Math.pow(1 - clamped, 3);
  return Math.max(clamped, Math.min(1, m));
}

export type BetLike = { market: string; outcome: string; wager: number; odds?: number };

function sameOutcome(a: string, b: string) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * How many outcomes are realistically possible per market.
 * This is the platform's published line: the objective chance for one outcome.
 */
export function possibleOutcomes(market: string): number {
  switch (market) {
    case "date": {
      const due = new Date("2027-01-28T00:00:00+01:00");
      const days = Math.max(1, Math.ceil((due.getTime() - Date.now()) / 86400000) + 1);
      return days;
    }
    case "weight":
      return 16; // 2.0 - 5.0 kg in 0.2 steps
    case "length":
      return 16; // 45 - 60 cm
    case "name":
      return 40; // plausible Dutch names
    case "hair":
      return 3; // HAIR_COLORS
    case "eyes":
      return 4; // EYE_COLORS
    default:
      return 10;
  }
}

/** Objective chance for one outcome, based on the number of possible outcomes. */
export function chanceEstimate(market: string): number {
  return Math.round((100 / possibleOutcomes(market)) * 10) / 10;
}

/** The chance implied by a price. */
export function impliedChance(odds: number): number {
  return Math.round((100 / odds) * 10) / 10;
}

/** The pool and the money on one outcome, for a market. */
export function poolState(market: string, bets: BetLike[], outcome: string) {
  const marketBets = bets.filter((b) => b.market === market);
  const pool = marketBets.reduce((s, b) => s + (b.wager || 0), 0);
  const outcomePool = marketBets
    .filter((b) => sameOutcome(b.outcome, outcome))
    .reduce((s, b) => s + (b.wager || 0), 0);
  const distinct = new Set(marketBets.map((b) => String(b.outcome).trim().toLowerCase())).size;
  return { marketBets, pool, outcomePool, otherPool: pool - outcomePool, distinct };
}

/** The biggest stake a single bettor may place right now = the current pool (used for quick-select cards). */
export function maxStakeFor(market: string, bets: BetLike[]): number {
  const { pool } = poolState(market, bets, "");
  if (pool <= 0) return MAX_STAKE_PER_BET;
  return Math.round(pool * 100) / 100;
}

/** Soft cap for a single bet: 5x the current pool. */
export function maxBetFor(market: string, bets: BetLike[]): number {
  const { pool } = poolState(market, bets, "");
  if (pool <= 0) return MAX_STAKE_PER_BET;
  return Math.round(pool * 5 * 100) / 100;
}

/** The smallest ticket, ~25% of the pool rounded to nearest 5, at least 5. */
export function minStakeFor(market: string, bets: BetLike[]): number {
  const { pool } = poolState(market, bets, "");
  if (pool <= 0) return MIN_STAKE_BASE;
  const raw = pool * MIN_STAKE_SHARE_OF_POOL;
  return Math.max(MIN_STAKE_BASE, Math.round(raw / 5) * 5 || MIN_STAKE_BASE);
}

/**
 * The live price for an outcome.
 * Once the pool has money on this outcome, the pool sets the price:
 *      price = pool / money on this outcome
 * While the outcome is unbacked, the platform's published line is quoted
 * instead, so a thin market still shows a sane price instead of infinity.
 */
export function liveOdds(market: string, bets: BetLike[], outcome: string, stake = 0): number | null {
  const { pool, outcomePool } = poolState(market, bets, outcome);
  const p = pool + stake;
  const w = outcomePool + stake;
  if (p <= 0 || w <= 0) {
    return null;
  }
  const x = w / p;
  const m = haircutMultiplier(x);
  const odds = m / x;
  return Math.round(Math.min(MAX_ODDS, Math.max(1, odds)) * 100) / 100;
}

/**
 * Live quote for a bet you are about to place.
 * The payout is your share of the pot if the market closed right now.
 */
export function quote(market: string, bets: BetLike[], outcome: string, stake: number) {
  const { pool, outcomePool, otherPool, distinct } = poolState(market, bets, outcome);
  const odds = liveOdds(market, bets, outcome, stake) ?? 0;
  const rawPayout = odds ? stake * odds : 0;

  return {
    // the price you play at
    odds,
    // objective chance for one outcome (the platform's published line)
    chance: chanceEstimate(market),
    // what the current price implies
    implied: odds ? impliedChance(odds) : 0,
    // your payout if the market closed right now
    estPayout: Math.round(rawPayout * 100) / 100,
    // what it would be without the max-win cap
    rawPayout: Math.round(rawPayout * 100) / 100,
    // the most you can win: the money the others put in
    maxWin: otherPool,
    minStake: minStakeFor(market, bets),
    maxStake: maxStakeFor(market, bets),
    pool: pool + stake,
    outcomePool: outcomePool + stake,
    distinct,
    open: distinct === 0,
    // taking the other side of existing money = calling
    calls: distinct > 0 && outcomePool === 0 && pool > 0,
    // joining money on the same outcome = sharing
    shares: outcomePool > 0,
  };
}

/**
 * Live value of an already-placed bet.
 * Your claim on the pot: if your outcome wins right now, you would receive
 * (your stake / money on that outcome) x pot.
 */
export function quoteExisting(market: string, bets: BetLike[], outcome: string, wager: number) {
  const { pool, outcomePool } = poolState(market, bets, outcome);
  if (pool <= 0 || outcomePool <= 0) {
    return { odds: 0, chance: chanceEstimate(market), value: 0, pool, distinct: 0 };
  }
  const x = outcomePool / pool;
  const m = haircutMultiplier(x);
  const odds = m / x;
  const value = wager * odds;
  return {
    odds: Math.round(odds * 100) / 100,
    chance: chanceEstimate(market),
    value: Math.round(value * 100) / 100,
    pool,
    distinct: new Set(
      bets.filter((b) => b.market === market).map((b) => String(b.outcome).trim().toLowerCase())
    ).size,
  };
}

/** Live quote for a market as a whole (price for the most backed outcome). */
export function marketQuote(market: string, bets: BetLike[]) {
  const { marketBets, pool, distinct } = poolState(market, bets, "");
  const byOutcome = new Map<string, number>();
  marketBets.forEach((b) => {
    const k = String(b.outcome).trim().toLowerCase();
    byOutcome.set(k, (byOutcome.get(k) || 0) + (b.wager || 0));
  });
  let leading = "";
  let leadingPool = 0;
  byOutcome.forEach((v, k) => {
    if (v > leadingPool) {
      leadingPool = v;
      leading = k;
    }
  });

  // Market card shows the odds a NEW (fresh) bettor would get on an unbacked outcome,
  // so a market with activity still advertises an opportunity (>1x) instead of 1x.
  const minStake = minStakeFor(market, bets);
  const odds = (liveOdds(market, bets, "", minStake) ?? (leading ? (liveOdds(market, bets, leading) ?? 0) : 0));
 
  return {
    odds,
    chance: chanceEstimate(market),
    implied: odds ? impliedChance(odds) : 0,
    pool,
    distinct,
    leadingOutcome: leading || null,
    leadingPool,
  };
}
