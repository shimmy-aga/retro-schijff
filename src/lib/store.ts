import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  quote,
  minStakeFor,
  maxBetFor,
  MAX_STAKE_PER_BET,
  haircutMultiplier,
  MARKET_KEYS,
} from "./odds";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "db.json");

type DB = {
  config: any;
  guesses: any[];
  bets: any[];
  wishes: any[];
  votes: any[];
  cravings: any[];
  scores: any[];
};

function defaultConfig() {
  return {
    dueDate: "2027-01-28T00:00:00.000Z",
    born: false,
    nameCandidates: [],
    votingEnabled: true,
    mealOptions: ["Friet", "Pizza", "Sushi", "Pannenkoek"],
    pokemonOptions: ["Pikachu", "Eevee", "Charmander", "Squirtle", "Bulbasaur", "Jigglypuff"],
    snackCount: 0,
  };
}

function readDB(): DB {
  try {
    if (!fs.existsSync(FILE)) {
      const db: DB = { config: defaultConfig(), guesses: [], bets: [], wishes: [], votes: [], cravings: [], scores: [] };
      writeDB(db);
      return db;
    }
    const raw = fs.readFileSync(FILE, "utf8");
    const db = JSON.parse(raw) as DB;
    if (!db.config) db.config = defaultConfig();
    if (!db.bets) db.bets = [];
    return db;
  } catch {
    const db: DB = { config: defaultConfig(), guesses: [], bets: [], wishes: [], votes: [], cravings: [], scores: [] };
    writeDB(db);
    return db;
  }
}

function writeDB(db: DB) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function getConfig() {
  return readDB().config;
}
export function saveConfig(patch: any) {
  const db = readDB();
  db.config = { ...db.config, ...patch };
  writeDB(db);
  return db.config;
}
export function getGuesses() {
  return readDB().guesses;
}
export function addGuess(g: any) {
  const db = readDB();
  const item = { id: randomUUID(), createdAt: new Date().toISOString(), score: null, ...g };
  db.guesses.push(item);
  writeDB(db);
  return item;
}
export function getBets() {
  return readDB().bets;
}

export function resolveBets() {
  const db = readDB();
  const c = db.config;
  if (!c.born) return { error: "not born yet" };
  const actual = {
    date: c.birthDate ? new Date(c.birthDate).toISOString().slice(0, 10) : null,
    weight: c.weight,
    length: c.length,
    gender: c.gender,
    hair: c.hair,
    eyes: c.eyes,
    name: c.babyName,
  };

  function isWin(b: any): boolean {
    const o = String(b.outcome).trim();
    switch (b.market) {
      case "date":
        return actual.date !== null && o === actual.date;
      case "weight":
        return actual.weight != null && Math.abs(Number(o) - actual.weight) <= 0.2;
      case "length":
        return actual.length != null && Math.abs(Number(o) - actual.length) <= 1;
      case "gender":
        return actual.gender != null && o.toLowerCase() === actual.gender.toLowerCase();
      case "hair":
        return actual.hair != null && o.toLowerCase() === actual.hair.toLowerCase();
      case "eyes":
        return actual.eyes != null && o.toLowerCase() === actual.eyes.toLowerCase();
      case "name":
        return actual.name != null && o.toLowerCase() === actual.name.toLowerCase();
      default:
        return false;
    }
  }

  // Pooled settlement: the pot is the liability. When the market closes the
  // pot is shared among the winning tickets, pro rata to their stake, minus
  // the take-out. Each ticket's win is capped (max win per ticket, like real
  // pari-mutuel jurisdictions); the surplus is redistributed to the other
  // winners. Every payout is covered by the pot - nothing is ever owed.
  const markets = new Set(db.bets.map((b: any) => b.market));
  for (const m of markets) {
    const marketBets = db.bets.filter((b: any) => b.market === m);
    const pool = marketBets.reduce((s: number, b: any) => s + (b.wager || 0), 0);
    const winners = marketBets.filter(isWin);
    if (winners.length === 0) {
      // nobody backed the right outcome: void, everyone gets their stake back
      marketBets.forEach((b: any) => { b.payout = b.wager; b.won = false; });
      continue;
    }

    const winningPool = winners.reduce((s: number, b: any) => s + (b.wager || 0), 0);
    const x = pool > 0 ? winningPool / pool : 1;
    const mult = haircutMultiplier(x);
    const winnerPool = mult * pool;
    const loserPool = (1 - mult) * pool;
    const losingStakes = pool - winningPool;

    winners.forEach((b: any) => {
      b.payout = Math.round(((b.wager / winningPool) * winnerPool) * 100) / 100;
      b.odds = Math.round((mult / x) * 100) / 100;
      b.won = true;
    });
    marketBets.forEach((b: any) => {
      if (!b.won) {
        if (losingStakes > 0) {
          b.payout = Math.round(((b.wager / losingStakes) * loserPool) * 100) / 100;
        } else {
          b.payout = 0;
        }
      }
    });
  }

  c.resolved = true;
  writeDB(db);
  return { ok: true, resolved: db.bets.length };
}

export function addBet(b: any) {
  const db = readDB();
  const stake = Number(b.wager);
  if (!Number.isFinite(stake) || stake <= 0) return { error: "Inzet moet groter dan 0 zijn" };

  if (!MARKET_KEYS.includes(b.market)) return { error: "Onbekende markt" };
  if (typeof b.outcome !== "string" || b.outcome.trim() === "") return { error: "Uitkomst is verplicht" };
  if (typeof b.guestName !== "string" || b.guestName.trim() === "") return { error: "Naam is verplicht" };

  const marketBets = db.bets.filter((x: any) => x.market === b.market);
  const exposure = marketBets.reduce((s: number, x: any) => s + (x.wager || 0), 0);
  const minStake = minStakeFor(b.market, db.bets);
  if (stake < minStake) {
    return { error: `Minimale inzet is €${minStake} (pot van €${exposure})` };
  }

  const sameOutcome = marketBets.filter(
    (x: any) => String(x.outcome).toLowerCase() === String(b.outcome).toLowerCase()
  );
  const opposite = marketBets.filter(
    (x: any) => String(x.outcome).toLowerCase() !== String(b.outcome).toLowerCase()
  );

  // the price includes your own stake, exactly like a tote board shows a ticket price
  const q = quote(b.market, db.bets, b.outcome, stake);
  const odds = q.odds;

  const maxBet = maxBetFor(b.market, db.bets);
  if (stake > maxBet) {
    return { error: `Maximaal €${maxBet} inzet (5x pot)` };
  }

  // a call takes the other side: the existing bets on the opposite outcome are called
  opposite.forEach((x: any) => { x.called = true; });
  sameOutcome.forEach((x: any) => { x.shared = true; });

  const existing = db.bets.find(
    (x: any) =>
      x.guestName === String(b.guestName).trim() &&
      x.market === b.market &&
      String(x.outcome).toLowerCase() === String(b.outcome).trim().toLowerCase()
  );

  if (existing) {
    existing.wager = (existing.wager || 0) + stake;
    existing.odds = odds;
    existing.called = existing.called || opposite.length > 0;
    existing.shared = true;
    writeDB(db);
    return existing;
  }

  const item = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    payout: null,
    called: opposite.length > 0,
    shared: sameOutcome.length > 0,
    guestName: String(b.guestName).trim(),
    market: b.market,
    outcome: String(b.outcome).trim(),
    wager: stake,
    odds,
  };
  db.bets.push(item);
  writeDB(db);
  return item;
}
export function getWishes() {
  return readDB().wishes;
}
export function addWish(w: any) {
  const db = readDB();
  const item = { id: randomUUID(), createdAt: new Date().toISOString(), reactions: {}, ...w };
  db.wishes.push(item);
  writeDB(db);
  return item;
}
export function reactWish(id: string, emoji: string) {
  const db = readDB();
  const w = db.wishes.find((x) => x.id === id);
  if (!w) throw new Error("not found");
  w.reactions = w.reactions || {};
  w.reactions[emoji] = (w.reactions[emoji] || 0) + 1;
  writeDB(db);
  return w;
}
export function getVotes() {
  return readDB().votes;
}
export function addVote(v: any) {
  const db = readDB();
  const item = { id: randomUUID(), createdAt: new Date().toISOString(), ...v };
  db.votes.push(item);
  writeDB(db);
  return item;
}
export function getCravings() {
  return readDB().cravings;
}
export function addCraving(c: any) {
  const db = readDB();
  const item = { id: randomUUID(), createdAt: new Date().toISOString(), count: 1, ...c };
  db.cravings.push(item);
  writeDB(db);
  return item;
}
export function bumpCraving(id: string) {
  const db = readDB();
  const c = db.cravings.find((x) => x.id === id);
  if (!c) throw new Error("not found");
  c.count += 1;
  writeDB(db);
  return c;
}
export function bumpSnack() {
  const db = readDB();
  db.config.snackCount = (db.config.snackCount || 0) + 1;
  writeDB(db);
  return { count: db.config.snackCount };
}
export function getScores() {
  return readDB().scores;
}
export function addScore(s: any) {
  const db = readDB();
  const item = { id: randomUUID(), createdAt: new Date().toISOString(), game: s.game || "deadlift", ...s };
  db.scores.push(item);
  writeDB(db);
  return item;
}