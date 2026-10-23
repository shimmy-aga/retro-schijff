"use client";
import { useEffect, useState, useRef } from "react";
import Nav from "@/components/Nav";
import Particles from "@/components/Particles";
import { api, type Bet, type Market } from "@/lib/data";
import { Coins } from "lucide-react";
import { HAIR_COLORS, EYE_COLORS } from "@/lib/colors";
import { quote, liveOdds, MARKET_LABEL, MAX_STAKE_PER_BET, maxBetFor } from "@/lib/odds";
import RetroSelect from "@/components/RetroSelect";
import RetroCalendar from "@/components/RetroCalendar";

const today = new Date().toISOString().slice(0, 10);

export default function GokPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [name, setName] = useState("");
  const [newPlayer, setNewPlayer] = useState(false);
  const [marketKey, setMarketKey] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");
  const [wager, setWager] = useState<number | "">(0);
  const [submitted, setSubmitted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; outcome?: string; wager?: string }>({});
  const [shakeTick, setShakeTick] = useState(0);
  const betError = errors.name || errors.outcome || errors.wager || null;
  const formRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [m, b, c] = await Promise.all([api.getMarkets(), api.getBets(), api.getConfig()]);
    setMarkets(m);
    setBets(b);
    setConfig(c);
  };
  useEffect(() => { load(); }, []);

  const market = markets.find((m) => m.key === marketKey);
  const players = Array.from(new Set(bets.map((b) => b.guestName))).sort();
  const q = marketKey ? quote(marketKey, bets, outcome, Number(wager) || 0) : null;
  const lockedOdds = q?.odds ?? null;
  const likelihood = q?.chance ?? 0;
  const potentialPayout = q?.estPayout ?? null;
  const maxStake = q?.maxStake ?? MAX_STAKE_PER_BET;
  const minStake = q?.minStake ?? 5;
  const maxBet = marketKey ? maxBetFor(marketKey, bets) : MAX_STAKE_PER_BET;
  const quickCards = () => {
    if (minStake >= maxStake) return [minStake];
    const step = Math.max(5, Math.round(((maxStake - minStake) / 3) / 5) * 5);
    const vals: number[] = [];
    for (let v = minStake; v < maxStake && vals.length < 3; v += step) vals.push(v);
    if (!vals.includes(maxStake)) vals.push(maxStake);
    return Array.from(new Set(vals)).slice(0, 4);
  };

  const selectMarket = (k: string) => {
    setMarketKey(k);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const [lastBet, setLastBet] = useState<Bet | null>(null);
  const submit = async () => {
    const newErrors: { name?: string; outcome?: string; wager?: string } = {};
    if (!name) newErrors.name = "Naam is verplicht";
    if (!outcome) newErrors.outcome = "Uitkomst is verplicht";
    if (!market) newErrors.outcome = newErrors.outcome || "Markt is verplicht";
    if (Number(wager) <= 0) newErrors.wager = "Inzet moet groter dan 0 zijn";
    else if (Number(wager) < minStake || Number(wager) > maxBet) newErrors.wager = `Inzet moet tussen €${minStake} en €${maxBet} liggen`;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeTick((t) => t + 1);
      return;
    }
    setPlacing(true);
    const res = await api.addBet({ guestName: name, market: marketKey as string, outcome, wager: Number(wager), odds: lockedOdds ?? 0 });
    if (res && (res as any).error) {
      setPlacing(false);
      setErrors({ wager: (res as any).error });
      setShakeTick((t) => t + 1);
      return;
    }
    setErrors({});
    const bet = res as Bet;
    setLastBet(bet);
    setSubmitted(true);
    setModalOpen(true);
    await load();
    setPlacing(false);
  };

  const resetForm = () => {
    setOutcome("");
    setWager(10);
    setName("");
    setNewPlayer(false);
    setMarketKey(null);
    setSubmitted(false);
    setLastBet(null);
    setModalOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const marketLabel = (k: string) => markets.find((m) => m.key === k)?.label ?? k;
  const liveBet = lastBet ? bets.find((b) => b.id === lastBet.id) : undefined;

  return (
    <div className="relative min-h-screen">
      <Particles />
      <Nav />
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <h1 className="font-display text-4xl font-bold gradient-text mb-4">🎰 Gokken op de baby</h1>
        <p className="opacity-70 mb-6">Wed op specifieke uitkomsten. Odds komen uit de pot en veranderen met elke bet.</p>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">1. Kies een markt (klik op een kaart)</div>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">2. Voorspel de uitkomst</div>
        <div className="card p-3 mb-8 opacity-70 text-xs font-retro">3. Kies inzet en plaats bet</div>

        <div className="grid lg:grid-cols-3 gap-x-4 gap-y-12 mb-12">
          {/* Markets */}
          <div className="lg:col-span-2 space-y-10">
            <div className="card p-5">
              <h2 className="font-display text-xl font-bold mb-3">Markten &amp; live odds</h2>
              <p className="text-xs opacity-60 mb-3">Odds veranderen naarmate meer mensen inzetten.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {markets.map((m) => (
                  <button key={m.key} onClick={() => selectMarket(m.key)}
                    className={`block w-full p-4 text-left border-4 transition-all duration-150 cursor-pointer ${marketKey === m.key ? "bg-accent text-white border-accent shadow-[8px_8px_0_0_var(--border)] -translate-y-1" : "bg-card text-foreground border-border shadow-[4px_4px_0_0_var(--border)] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--border)]"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">
                        {m.label}
                      </span>
                      <span className={`font-retro text-sm px-2 py-0.5 ${marketKey === m.key ? "bg-white text-accent" : "bg-accent text-white"}`}>{(() => { const stake = Number(wager) || m.minStake || 5; const o = liveOdds(m.key, bets, "", stake); return o && o !== 1 ? `${o}x` : "—"; })()}</span>
                    </div>
                    <div className={`text-xs mt-1 ${marketKey === m.key ? "opacity-90" : "opacity-70"}`}>
                      {m.desc} - {m.betCount} bets - pot €{m.pool ?? 0}
                    </div>
                    <div className={`text-xs mt-1 font-retro ${marketKey === m.key ? "opacity-90" : "opacity-60"}`}>
                      kans ≈ {m.chance}%
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {marketKey && (
              <div ref={formRef} className="card p-5 scroll-mt-24">
                <h2 className="font-display text-xl font-bold mb-3">Jouw weddenschap — {market?.label}</h2>
                <RetroSelect key={errors.name ? `sel-${shakeTick}` : "sel"} value={newPlayer ? "Nieuwe speler" : (name || "")} onChange={(v) => { if (v === "Nieuwe speler") { setNewPlayer(true); setName(""); } else { setNewPlayer(false); setName(v); } }} options={[...players, "Nieuwe speler"]} placeholder="Kies speler" className="mb-3" error={!!errors.name} />
                {errors.name && <div className="text-xs text-red-600 mb-2">{errors.name}</div>}
                {newPlayer && (
                  <input key={errors.name ? `np-${shakeTick}` : "np"} className={`input mb-3 ${errors.name ? "shake" : ""}`} style={errors.name ? { boxShadow: "5px 5px 0 0 #dc2626", borderColor: "#dc2626" } : undefined} placeholder="Nieuwe spelernaam" value={name} onChange={(e) => setName(e.target.value)} />
                )}
                <label className="text-xs font-bold">Uitkomst voorspelling</label>
                {marketKey === "date" ? (
                  <>
                    <RetroCalendar key={errors.outcome ? `cal-${shakeTick}` : "cal"} value={outcome} onChange={setOutcome} min={today} className="mb-3" error={!!errors.outcome} />
                  </>
                ) : marketKey === "hair" ? (
                  <RetroSelect key={errors.outcome ? `hair-${shakeTick}` : "hair"} value={outcome} onChange={setOutcome} options={HAIR_COLORS} placeholder="Kies een haarkleur" className="mb-3" error={!!errors.outcome} />
                ) : marketKey === "eyes" ? (
                  <RetroSelect key={errors.outcome ? `eyes-${shakeTick}` : "eyes"} value={outcome} onChange={setOutcome} options={EYE_COLORS} placeholder="Kies een oogkleur" className="mb-3" error={!!errors.outcome} />
                ) : (
                  marketKey === "weight" ? (
                    <div className="relative mb-3">
                      <input key={errors.outcome ? `out-${shakeTick}` : "out"} className={`input pr-12 ${errors.outcome ? "shake" : ""}`} style={errors.outcome ? { boxShadow: "5px 5px 0 0 #dc2626", borderColor: "#dc2626" } : undefined} placeholder="bijv. 3.4" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-retro text-xs opacity-60 pointer-events-none">kg</span>
                    </div>
                  ) : (
                    <input key={errors.outcome ? `out-${shakeTick}` : "out"} className={`input mb-3 ${errors.outcome ? "shake" : ""}`} style={errors.outcome ? { boxShadow: "5px 5px 0 0 #dc2626", borderColor: "#dc2626" } : undefined} placeholder={
                      marketKey === "length" ? "bijv. 52 (cm)" :
                      "bijv. Emma"
                    } value={outcome} onChange={(e) => setOutcome(e.target.value)} />
                  )
                )}
                {errors.outcome && <div className="text-xs text-red-600 mb-2">{errors.outcome}</div>}
                <label className="text-xs font-bold">Inzet (euro)</label>
                <div className="flex gap-2 items-center mb-3">
                  <button type="button" className="btn btn-ghost text-xs px-3 py-2 min-h-[44px]" onClick={() => setWager(Math.max(minStake, (Number(wager) || minStake) - 5))}>−</button>
                  <input key={errors.wager ? `wager-${shakeTick}` : "wager"} type="number" className={`input flex-1 ${errors.wager ? "shake" : ""}`} style={errors.wager ? { boxShadow: "5px 5px 0 0 #dc2626", borderColor: "#dc2626" } : undefined} min={minStake} max={maxBet} value={wager === 0 ? "" : wager} onChange={(e) => setWager(e.target.value === "" ? 0 : Number(e.target.value))} />
                  <button type="button" className="btn btn-ghost text-xs px-3 py-2 min-h-[44px]" onClick={() => setWager(Math.min(maxBet, (Number(wager) || minStake) + 5))}>+</button>
                </div>
                {errors.wager && <div className="text-xs text-red-600 mb-2">{errors.wager}</div>}
                <div className="flex gap-2 flex-wrap mb-1 justify-center">
                  {quickCards().map((v) => (
                    <button key={v} onClick={() => setWager(v)} className="btn btn-ghost text-xs px-3 py-2 min-h-[40px]">{v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bet slip / placeholder */}
          {marketKey ? (
          <div className="card p-5 h-fit sticky top-20" style={{ borderColor: "var(--accent)", boxShadow: "5px 5px 0 0 var(--accent)" }}>
            <h2 className="font-retro text-lg mb-3">Bet Slip</h2>
            <div className="text-xs opacity-70 mb-1">Markt</div>
            <div className="font-bold mb-2">{market?.label}</div>
            <div className="text-xs opacity-70 mb-1">Uitkomst</div>
            <div className="font-bold mb-3">{outcome || "—"}</div>
            <div className="border-t-2 border-border pt-3 mb-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Odds</span>
                <b className="font-retro">{lockedOdds && lockedOdds !== 1 ? `${lockedOdds}x` : "—"}</b>
              </div>
              <div className="flex justify-between text-sm"><span>Kans</span><b>{likelihood}%</b></div>
              <div className="flex justify-between text-sm"><span>Inzet</span><b>€{wager}</b></div>
            </div>
            <div className="card p-3 mb-4 bg-accent2/20">
              <div className="text-xs opacity-70">Uitbetaling bij winst</div>
              <div className="font-retro text-2xl">
                {potentialPayout === null ? "—" : `€${potentialPayout}`}
                {potentialPayout !== null && (
                  <span className="text-sm opacity-70 ml-2">(winst €{Math.round((potentialPayout - Number(wager)) * 100) / 100})</span>
                )}
              </div>
            </div>
            {betError && (
              <div className="card p-3 mb-3 border-[#7f1d1d] text-white" style={{ backgroundColor: "#dc2626" }}>
                <div className="font-retro text-xs">{betError}</div>
                <button className="btn btn-ghost text-xs mt-2" onClick={() => setErrors({})}>OK</button>
              </div>
            )}
            <button className="btn w-full" onClick={submit} disabled={placing}>
              {placing ? "Bezig..." : "Plaats bet"}
            </button>
            {submitted && lastBet && (
              <div className="mt-2 text-xs text-center">
                {lastBet.called ? (
                  <span className="text-green-600">🔥 CALLED — je neemt de andere kant</span>
                ) : lastBet.shared ? (
                  <span className="text-blue-600">🤝 GEDEELD — je sluit aan op dezelfde uitkomst</span>
                ) : (
                  <span className="text-blue-600">✅ Nieuwe markt geopend</span>
                )}
              </div>
            )}
          </div>
          ) : (
          <div className="card p-5 text-right opacity-60 h-fit sticky top-20" style={{ borderColor: "var(--accent)", boxShadow: "5px 5px 0 0 var(--accent)" }}>
            <p>Kies een markt om je weddenschap te plaatsen</p>
          </div>
          )}
        </div>

        {/* Bet list */}
        <div className="card p-5">
          <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <Coins className="text-foreground" size={24} /> Weddenschappen
          </h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {bets.slice().reverse().map((b) => (
              <div key={b.id} className="flex justify-between items-center p-3 border-2 border-border bg-accent2/10">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{b.guestName}</span>
                  <span className="text-xs opacity-70">{(MARKET_LABEL as any)[b.market] ?? b.market}</span>
                </div>
                <div className="text-right">
                  {config?.resolved ? (
                    <span className={`font-retro text-xs ${b.won ? "text-green-500" : "text-red-500"}`}>
                      {b.won ? "✓" : "✗"} {b.outcome} · €{b.payout ?? 0}
                    </span>
                  ) : (
                    <span className="font-retro text-xs">
                      {b.outcome} · <span className="text-accent">€{b.wager} inzet</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {bets.length === 0 && <p className="text-sm opacity-60 text-right">Nog geen bets.</p>}
          </div>
        </div>
      </main>

      {/* Full-screen retro confirmation */}
      {modalOpen && lastBet && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-4">
          <div className="card p-8 max-w-md w-full text-center space-y-4">
            <div className="font-display text-2xl md:text-3xl gradient-text">✅ Weddenschap geplaatst!</div>
            <div className="space-y-2 text-sm text-left">
              <div className="flex justify-between border-b border-border pb-1">
                <span>Markt</span><b>{marketLabel(lastBet.market)}</b>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span>Uitkomst</span><b>{lastBet.outcome}</b>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span>Inzet</span><b>€{lastBet.wager}</b>
              </div>
              <div className="flex justify-between border-b border-border pb-1">
                <span>Odds nu</span><b className="font-retro">{(liveBet?.liveOdds ?? lastBet.odds) && (liveBet?.liveOdds ?? lastBet.odds) !== 1 ? `${liveBet?.liveOdds ?? lastBet.odds}x` : "—"}</b>
              </div>
              <div className="flex justify-between">
                <span>Waarde nu</span><b className="font-retro">€{liveBet?.liveValue ?? 0}</b>
              </div>
            </div>
            <p className="text-xs opacity-60">De pot groeit en de odds bewegen tot de markt sluit. Je deelt de pot met de andere winnaars.</p>
            <button className="btn w-full" onClick={resetForm}>Plaats nog een bet</button>
          </div>
        </div>
      )}
    </div>
  );
}