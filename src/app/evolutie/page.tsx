"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Nav from "@/components/Nav";
import Particles from "@/components/Particles";
import { api, type GameScore } from "@/lib/data";

const PROGRESS_PER_HIT = 12;
const PROGRESS_PER_PERFECT = 20;
const MAX_CHAIN_ID = 468;
const COOLDOWN = 250; // ms between taps (anti-spam)
const BASE_GOOD_WINDOW = 140; // ms
const MIN_GOOD_WINDOW = 90;

type Stage = { name: string; id: number | null };

export default function EvolutiePage() {
  const [stages, setStages] = useState<Stage[]>([{ name: "???", id: null }]);
  const [type, setType] = useState("???");
  const [typeColor, setTypeColor] = useState("bg-border");
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [lives, setLives] = useState(3);
  const [name, setName] = useState("");
  const [best, setBest] = useState<GameScore[]>([]);
  const [personalBest, setPersonalBest] = useState(0);
  const [flash, setFlash] = useState<"hit" | "perfect" | "miss" | null>(null);
  const [wobble, setWobble] = useState(false);
  const [finished, setFinished] = useState(false);
  const [completionTime, setCompletionTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [beatPos, setBeatPos] = useState(0); // 0-100 visual metronome

  const lastBeatTime = useRef(0);
  const beatIntervalRef = useRef(600);
  const lastTapTime = useRef(0);
  const raf = useRef<number | null>(null);
  const runningRef = useRef(false);
  const scoreRef = useRef(0);

  const loadBest = useCallback(() => {
    api.getScores().then((s) => setBest(s.filter((x) => x.game === "evolution").sort((a, b) => b.score - a.score).slice(0, 10)));
  }, []);
  useEffect(() => { loadBest(); }, []);

  // good window shrinks with score + combo
  const goodWindow = Math.max(MIN_GOOD_WINDOW, BASE_GOOD_WINDOW - Math.floor(scoreRef.current / 5) * 3 - (combo >= 10 ? 20 : 0) - stage * 15);
  const perfectWindow = 60;

  useEffect(() => {
    if (!running || finished) return;
    const t = setInterval(() => setTime((x) => x + 0.1), 100);
    return () => clearInterval(t);
  }, [running, finished]);

  useEffect(() => {
    if (!running || finished) return;
    const loop = () => {
      const now = Date.now();
      const interval = beatIntervalRef.current;
      const elapsed = now - lastBeatTime.current;
      setBeatPos(Math.min(100, (elapsed / interval) * 100));
      if (elapsed >= interval) {
        lastBeatTime.current = now;
        // random interval + occasional double beat or pause
        let next = 300 + Math.random() * 600;
        const r = Math.random();
        if (r < 0.15) next = 150; // double beat
        if (r > 0.85) next = 1000; // pause
        beatIntervalRef.current = next;
        setWobble(true);
        setTimeout(() => setWobble(false), 120);
      }
      raf.current = requestAnimationFrame(loop);
    };
    lastBeatTime.current = Date.now();
    beatIntervalRef.current = 400 + Math.random() * 400;
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [running, finished]);

  const fetchChain = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    for (let attempt = 0; attempt < 8; attempt++) {
      const id = 1 + Math.floor(Math.random() * MAX_CHAIN_ID);
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/evolution-chain/${id}`);
        if (!res.ok) continue;
        const data = await res.json();
        const path: { name: string; url: string }[] = [];
        let cur: any = data.chain;
        while (cur) {
          path.push({ name: cur.species.name, url: cur.species.url });
          if (cur.evolves_to && cur.evolves_to.length > 0) {
            cur = cur.evolves_to[Math.floor(Math.random() * cur.evolves_to.length)];
          } else {
            cur = null;
          }
        }
        if (path.length < 3) continue;

        const ids = await Promise.all(path.map(async (p) => {
          try {
            const r = await fetch(p.url);
            const d = await r.json();
            const pokeUrl = d.varieties?.[0]?.pokemon?.url || "";
            const m = pokeUrl.match(/\/(\d+)\/?$/);
            return m ? parseInt(m[1]) : null;
          } catch {
            return null;
          }
        }));
        if (ids.some((x) => x === null)) continue;

        const stageList: Stage[] = [{ name: "???", id: null }, ...path.map((p, i) => ({ name: p.name, id: ids[i]! }))];
        setStages(stageList);

        try {
          const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${ids[0]}`);
          const d = await r.json();
          const t = d.types?.[0]?.type?.name ?? "???";
          setType(t.toUpperCase());
          const colorMap: Record<string, string> = {
            grass: "bg-green-600", fire: "bg-red-600", water: "bg-blue-600",
            electric: "bg-yellow-500", psychic: "bg-pink-600", ice: "bg-cyan-500",
            dragon: "bg-indigo-600", dark: "bg-gray-700", fairy: "bg-pink-400",
            fighting: "bg-orange-700", poison: "bg-purple-600", ground: "bg-amber-700",
            flying: "bg-sky-500", bug: "bg-lime-600", rock: "bg-stone-600",
            ghost: "bg-violet-700", steel: "bg-slate-500", normal: "bg-gray-500",
          };
          setTypeColor(colorMap[t] || "bg-gray-500");
        } catch {
          setType("???");
          setTypeColor("bg-border");
        }

        setLoading(false);
        return;
      } catch {
        continue;
      }
    }
    setStages([{ name: "???", id: null }, { name: "Bulbasaur", id: 1 }, { name: "Ivysaur", id: 2 }, { name: "Venusaur", id: 3 }]);
    setType("GRASS");
    setTypeColor("bg-green-600");
    setLoading(false);
  };

  const start = async () => {
    await fetchChain(true);
    setStage(0); setProgress(0); setRunning(true); setTime(0);
    setCombo(0); setMaxCombo(0); setMisses(0); setConsecutiveMisses(0);
    setLives(3);
    setPerfects(0); setFinished(false); setCompletionTime(0); setFlash(null);
    lastBeatTime.current = Date.now();
    runningRef.current = true;
    scoreRef.current = 0;
  };

  const tap = () => {
    if (loading) return;
    if (!running || finished) { start(); return; }
    const now = Date.now();
    // anti-spam cooldown
    if (now - lastTapTime.current < COOLDOWN) return;
    lastTapTime.current = now;

    const interval = beatIntervalRef.current;
    const sinceBeat = (now - lastBeatTime.current) % interval;
    const dist = Math.min(sinceBeat, interval - sinceBeat);

    const gw = goodWindow;
    const pw = perfectWindow;
    const perfect = dist < pw;
    const good = dist < gw;

    if (good) {
      const gain = perfect ? PROGRESS_PER_PERFECT : PROGRESS_PER_HIT;
      setProgress((p) => {
        let np = p + gain;
        if (np >= 100) {
          setStage((st) => {
            const nst = st + 1;
            if (nst >= stages.length - 1) {
              setFinished(true);
              setCompletionTime(time);
              setRunning(false);
              runningRef.current = false;
            }
            return Math.min(stages.length - 1, nst);
          });
          np = 0;
        }
        return np;
      });
      setCombo((c) => {
        const nc = c + 1;
        if (nc > maxCombo) setMaxCombo(nc);
        return nc;
      });
      setConsecutiveMisses(0);
      if (perfect) setPerfects((p) => p + 1);
      setFlash("hit");
      setTimeout(() => setFlash(null), 150);
      scoreRef.current += (perfect ? PROGRESS_PER_PERFECT : PROGRESS_PER_HIT);
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = perfect ? 880 : 660;
        g.gain.value = 0.08;
        o.start(); o.stop(ctx.currentTime + 0.06);
      } catch {}
    } else {
      // miss penalty: subtract progress, reset combo
      setProgress((p) => Math.max(0, p - 8));
      setCombo(0);
      setConsecutiveMisses((c) => {
        const nc = c + 1;
        if (nc >= 3) {
          setMisses((m) => m + 1);
          setLives((l) => {
            const nl = l - 1;
            if (nl <= 0) {
              setFinished(true);
              setCompletionTime(time);
              setRunning(false);
              runningRef.current = false;
            }
            return Math.max(0, nl);
          });
          return 0;
        }
        return nc;
      });
      setFlash("miss");
      setTimeout(() => setFlash(null), 200);
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 150;
        g.gain.value = 0.12;
        o.start(); o.stop(ctx.currentTime + 0.15);
      } catch {}
    }
  };

  const save = async () => {
    if (!name) return;
    const pts = Math.max(0, 10000 - Math.round(completionTime * 100));
    const finalStage = stages[stages.length - 1];
    await api.addScore({
      playerName: name,
      score: pts,
      game: "evolution",
      pokemon: finalStage?.name,
      pokemonId: finalStage?.id ?? undefined,
      pokemonType: type,
    });
    loadBest();
    if (pts > personalBest) setPersonalBest(pts);
  };

  const currentName = stages[stage]?.name ?? "???";
  const currentId = stages[stage]?.id;
  const spriteUrl = currentId ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${currentId}.png` : "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/0.png";
  const displayName = stage === 0 ? "???" : currentName.toUpperCase();
  const pct = finished ? 100 : ((stage) / Math.max(1, stages.length - 1)) * 100 + (progress / Math.max(1, stages.length - 1));

  return (
    <div className="relative min-h-screen">
      <Particles />
      <Nav />
      <main className="relative z-10 max-w-3xl mx-auto px-4 py-10 text-center">
        <h1 className="font-display text-3xl md:text-5xl font-bold gradient-text mb-4">⚡ POKÉMON EVOLUTION RACE</h1>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">1. Tap op de beat (indicator in TAP ZONE rechts)</div>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">2. Perfecte tap = 20 progress, goed = 12</div>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">3. 3 missen achter elkaar = leven verliezen (3 levens)</div>
        <div className="card p-3 mb-8 opacity-70 text-xs font-retro">4. Evolueer alle fases om te winnen</div>

        <div className={`card p-6 mb-6 transition ${flash === "miss" ? "translate-x-1" : ""}`}>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="font-retro text-xs">STAGE: <span className="text-xl">{displayName}</span></div>
            <div className="font-retro text-xs">TIJD: <span className={`text-xl ${time > 20 ? "text-red-500" : ""}`}>{time.toFixed(1)}s</span></div>
            <div className="font-retro text-xs">COMBO: <span className="text-xl">{combo}x</span></div>
            <div className="font-retro text-xs">LEVEN: <span className="text-xl">{"❤️".repeat(Math.max(0, lives))}</span></div>
          </div>

          {/* Pokemon display */}
          <div className="flex justify-center mb-4">
            <div className={`transition-transform ${wobble ? "scale-110" : "scale-100"} ${flash === "perfect" ? "drop-shadow-[0_0_16px_#f5b700]" : ""}`}>
              <img src={spriteUrl} alt={displayName} className="w-32 h-32 object-contain" style={{ imageRendering: "pixelated" }} />
            </div>
          </div>
          <div className="text-center mb-4">
            <span className={`font-retro text-xs ${stage === 0 ? "bg-card text-foreground border-2 border-border" : typeColor} text-white px-2 py-1`}>{stage === 0 ? "???" : `${type} TYPE`}</span>
            {stage > 0 && <span className="ml-2 text-xs opacity-60">#{currentId}</span>}
          </div>

          {/* Progress bar */}
          <div className="mb-2 flex justify-between text-xs opacity-70">
            <span>{displayName}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-4 bg-card border-2 border-border overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#e85d2a] via-[#f5b700] to-[#ff6b9d] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Metronome bar */}
          <div className="relative w-full h-8 bg-card border-2 border-border overflow-hidden mb-4">
            <div className="absolute top-0 bottom-0 right-0 bg-accent2/40 border-l-2 border-accent2" style={{ width: `${Math.max(8, 20 - stage * 3)}%` }} />
            <div className="absolute top-0 right-0 text-[10px] font-retro opacity-60 pr-1">TAP ZONE</div>
            <div
              className="absolute top-0 bottom-0 w-2 bg-accent shadow-[0_0_8px_var(--accent)]"
              style={{ left: `${beatPos}%`, transform: "translateX(-50%)" }}
            />
          </div>

          {/* Overall progress */}
          <div className="mb-4">
            <div className="h-2 bg-card border-2 border-border overflow-hidden">
              <div
                className="h-full bg-accent2 transition-all duration-200"
                style={{ width: `${Math.min(100, (stage / Math.max(1, stages.length - 1)) * 100 + progress / Math.max(1, stages.length - 1))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs opacity-60 mt-1">
              {stages.map((s, i) => <span key={i}>{stage >= i ? s.name : "???"}</span>)}
            </div>
          </div>

          {finished && (
            <div className="text-center mb-4 p-4 bg-accent/20 border-4 border-accent">
              <div className="font-display text-3xl text-accent mb-2">🎉 EVOLUTIE COMPLEET!</div>
              <div className="text-lg mb-2">{displayName} bereikt in {completionTime.toFixed(1)}s</div>
              <div className="text-sm opacity-70">Geen verdere evolutie. Sla je score op!</div>
            </div>
          )}

          {!finished && (
            <button onClick={tap} disabled={loading}
              className={`btn text-2xl px-12 py-6 w-full ${running ? "animate-pulse" : ""}`}>
              {loading ? "LADEN..." : running ? "TAP OP DE BEAT!" : "START RACE"}
            </button>
          )}

          {finished && (
            <div className="mt-4 space-y-3">
              <div className="text-sm opacity-70">Perfects: {perfects} · Misses: {misses} · Max combo: {maxCombo}</div>
              <input className="input max-w-xs mx-auto" placeholder="Jouw naam" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="flex gap-2 justify-center">
                <button className="btn" onClick={save}>Opslaan</button>
                <button className="btn btn-secondary" onClick={start}>Opnieuw</button>
              </div>
              {personalBest > 0 && <div className="text-xs opacity-60">Jouw PR: {personalBest} pts</div>}
            </div>
          )}
        </div>

        <div className="card p-6 text-left">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-display text-2xl font-bold">🏆 Hall of Evolution</h2>
          </div>
          {best.map((s, i) => (
            <div key={s.id} className={`flex justify-between items-center p-2 border-b-2 border-border ${i === 0 ? "bg-accent2/30" : ""}`}>
              <span className="font-retro text-xs">
                <span className="gradient-text">{i === 0 ? "#1" : i === 1 ? "#2" : i === 2 ? "#3" : `#${i+1}`}</span> {s.playerName}
              </span>
              <b className="font-retro gradient-text">{s.score} pts</b>
            </div>
          ))}
          {best.length === 0 && <p className="opacity-60 text-sm text-left">Nog geen evoluties.</p>}
        </div>

        {/* Pokemon Card Collection */}
        <div className="card p-6 mt-6 text-left">
          <h2 className="font-display text-2xl font-bold mb-4">🃏 Pokémon Kaarten</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {best.filter((s) => s.pokemon).map((s) => (
              <div key={s.id} className="card p-3 text-left">
                {s.pokemonId && (
                  <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.pokemonId}.png`} alt={s.pokemon} className="w-20 h-20 mx-auto" style={{ imageRendering: "pixelated" }} />
                )}
                <div className="font-display text-sm mt-2">{s.pokemon?.toUpperCase()}</div>
                <div className="text-xs opacity-60">{s.pokemonType}</div>
                <div className="text-xs opacity-60 mt-1">van {s.playerName}</div>
              </div>
            ))}
            {best.filter((s) => s.pokemon).length === 0 && (
              <p className="opacity-60 text-sm col-span-full text-left">Nog geen kaarten.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
