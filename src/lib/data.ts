export type Config = {
  dueDate: string; // ISO
  born: boolean;
  birthDate?: string;
  weight?: number; // kg
  length?: number; // cm
  gender?: "jongen" | "meisje";
  hair?: string;
  eyes?: string;
  babyName?: string;
  photoUrl?: string;
  nameCandidates: string[];
  votingEnabled: boolean;
  mealOptions: string[];
  pokemonOptions: string[];
  snackCount: number;
  resolved?: boolean;
};

export type Guess = {
  id: string;
  createdAt: string;
  guestName: string;
  birthDateGuess: string;
  weightGuess: number;
  lengthGuess: number;
  genderGuess?: "jongen" | "meisje" | "verrassing";
  hair: string;
  eyes: string;
  wager: number;
  odds: number;
  markets: string[];
  score?: number | null;
  payout?: number | null;
};

export type Bet = {
  id: string;
  createdAt: string;
  guestName: string;
  market: string;
  outcome: string;
  wager: number;
  odds: number;
  liveOdds?: number;
  liveValue?: number;
  marketPool?: number;
  matched?: boolean;
  called?: boolean;
  shared?: boolean;
  won?: boolean;
  payout?: number | null;
};

export type Market = {
  key: string;
  label: string;
  odds: number | null;
  chance: number;
  implied?: number;
  desc: string;
  betCount: number;
  pool?: number;
  maxStake?: number;
  minStake?: number;
  marketCap?: number;
};

export type Wish = {
  id: string;
  createdAt: string;
  author: string;
  message: string;
  avatarColor: string;
  reactions: Record<string, number>;
};

export type Vote = { id: string; createdAt: string; voterName: string; category: "meal" | "pokemon"; choice: string };
export type Craving = { id: string; createdAt: string; craving: string; emoji: string; count: number };
export type GameScore = { id: string; createdAt: string; playerName: string; score: number; game?: string; pokemon?: string; pokemonId?: number; pokemonType?: string };

const BASE = "";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getConfig: () => fetch(`${BASE}/api/config`).then((r) => j<Config>(r)),
  saveConfig: (c: Partial<Config>) =>
    fetch(`${BASE}/api/config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).then((r) => j<Config>(r)),
  getGuesses: () => fetch(`${BASE}/api/guesses`).then((r) => j<Guess[]>(r)),
  addGuess: (g: Omit<Guess, "id" | "createdAt" | "score">) =>
    fetch(`${BASE}/api/guesses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(g) }).then((r) => j<Guess>(r)),
  getBets: () => fetch(`${BASE}/api/bets`).then((r) => j<Bet[]>(r)),
  addBet: (b: Omit<Bet, "id" | "createdAt" | "payout">) =>
    fetch(`${BASE}/api/bets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => j<Bet & { error?: string }>(r)),
  getMarkets: () => fetch(`${BASE}/api/markets`).then((r) => j<Market[]>(r)),
  resolveBets: () => fetch(`${BASE}/api/resolve`, { method: "POST" }).then((r) => j<any>(r)),
  getWishes: () => fetch(`${BASE}/api/wishes`).then((r) => j<Wish[]>(r)),
  addWish: (w: { author: string; message: string }) =>
    fetch(`${BASE}/api/wishes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(w) }).then((r) => j<Wish>(r)),
  reactWish: (id: string, emoji: string) =>
    fetch(`${BASE}/api/wishes/${id}/react`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }) }).then((r) => j<Wish>(r)),
  getVotes: () => fetch(`${BASE}/api/votes`).then((r) => j<Vote[]>(r)),
  addVote: (v: { voterName: string; category: "meal" | "pokemon"; choice: string }) =>
    fetch(`${BASE}/api/votes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }).then((r) => j<Vote>(r)),
  getCravings: () => fetch(`${BASE}/api/cravings`).then((r) => j<Craving[]>(r)),
  addCraving: (c: { craving: string; emoji: string }) =>
    fetch(`${BASE}/api/cravings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).then((r) => j<Craving>(r)),
  bumpCraving: (id: string) =>
    fetch(`${BASE}/api/cravings/${id}/bump`, { method: "POST" }).then((r) => j<Craving>(r)),
  bumpSnack: () => fetch(`${BASE}/api/snack`, { method: "POST" }).then((r) => j<{ count: number }>(r)),
  getScores: () => fetch(`${BASE}/api/scores`).then((r) => j<GameScore[]>(r)),
  addScore: (s: { playerName: string; score: number; game?: string; pokemon?: string; pokemonId?: number; pokemonType?: string }) =>
    fetch(`${BASE}/api/scores`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }).then((r) => j<GameScore>(r)),
};