"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Particles from "@/components/Particles";
import Countdown from "@/components/Countdown";
import { api, type Config, type Bet, type GameScore } from "@/lib/data";
import { MARKET_LABEL } from "@/lib/odds";
import confetti from "canvas-confetti";
import { Dices, Dumbbell, Zap, Coins, Trophy, Target } from "lucide-react";

export default function Home() {
  const [config, setConfig] = useState<Config | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [scores, setScores] = useState<GameScore[]>([]);

  useEffect(() => {
    api.getConfig().then(setConfig);
    api.getBets().then(setBets);
    api.getScores().then((s) => setScores(s.sort((a, b) => b.score - a.score).slice(0, 5)));
  }, []);

  useEffect(() => {
    let buf = "";
    const handler = (e: KeyboardEvent) => {
      buf = (buf + e.key.toLowerCase()).slice(-10);
      if (buf === "tinyfemboy") {
        document.body.classList.toggle("fatass-mode");
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const flipBorn = async () => {
    if (!config) return;
    const updated = await api.saveConfig({ born: !config.born });
    setConfig(updated);
    if (updated.born) confetti({ particleCount: 400, spread: 160, origin: { y: 0.5 } });
  };

  return (
    <div className="relative min-h-screen">
      <Particles />
      <Nav />
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-14">
        <section className="text-center mb-16">
          <h1 className="font-display text-5xl md:text-7xl font-bold gradient-text mb-6">
            Baby komt eraan!
          </h1>
          <p className="text-lg opacity-80 mb-8">
            Een kleine Schijff op komst 👶
          </p>
          <Countdown />
        </section>

        <section className="grid sm:grid-cols-2 gap-6 mb-12">
          <div className="card p-6">
            <div className="font-display text-2xl font-bold mb-2 flex items-center gap-2"><Dices className="text-accent" size={24} /> <span className="gradient-text">Gokken</span></div>
            <div className="text-sm opacity-70 mb-4">Wed op de geboorte — odds, wagers, payouts</div>
            <a href="/gok" className="btn w-full">Plaats weddenschap</a>
          </div>
          <div className="card p-6">
            <div className="font-display text-2xl font-bold mb-2 flex items-center gap-2"><Dumbbell className="text-accent" size={24} /> <span className="gradient-text">Deadlift</span></div>
            <div className="text-sm opacity-70 mb-4">Mini-game — timing, combo's, Hall of Gains</div>
            <a href="/deadlift" className="btn btn-secondary w-full">Speel mini-game</a>
          </div>
          <div className="card p-6">
            <div className="font-display text-2xl font-bold mb-2 flex items-center gap-2"><Zap className="text-accent" size={24} /> <span className="gradient-text">Evolutie</span></div>
            <div className="text-sm opacity-70 mb-4">Pokémon rhythm race — tap op de beat, evolueer</div>
            <a href="/evolutie" className="btn btn-secondary w-full">Start race</a>
          </div>
          <div className="card p-6">
            <div className="font-display text-2xl font-bold mb-2 flex items-center gap-2"><Target className="text-accent" size={24} /> <span className="gradient-text">Shooter</span></div>
            <div className="text-sm opacity-70 mb-4">Verdedig de baby — schiet vijanden, pak power-ups</div>
            <a href="/shooter" className="btn w-full">Start shooter</a>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="card p-6">
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2 text-foreground"><Coins className="text-foreground" size={24} /> Weddenschappen</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
               {bets.slice().reverse().map((b) => (
                <div key={b.id} className="flex justify-between items-center p-3 border-2 border-border bg-accent2/10">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{b.guestName}</span>
                    <span className="text-xs opacity-70">{MARKET_LABEL[b.market] ?? b.market}</span>
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
              {bets.length === 0 && <p className="text-sm opacity-60">Nog geen bets.</p>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2 text-foreground"><Trophy className="text-foreground" size={24} /> Minigame Scoreboard</h2>
            <div className="space-y-2">
              {scores.map((s, i) => (
                <div key={s.id} className="flex justify-between items-center p-2 border-2 border-border ">
                  <span className="text-sm"><b>#{i+1}</b> {s.playerName} <span className="text-xs opacity-60">({s.game === "evolution" ? "Evolutie" : "Deadlift"})</span></span>
                  <span className="font-retro text-xs text-foreground">{s.score}</span>
                </div>
              ))}
              {scores.length === 0 && <p className="text-sm opacity-60">Nog geen scores.</p>}
            </div>
          </div>
        </section>

        <div className="mt-8 text-center text-xs opacity-40">
          Tip: typ "tinyfemboy" voor een verrassing
        </div>
      </main>
    </div>
  );
}