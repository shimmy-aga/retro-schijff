"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Nav from "@/components/Nav";
import Particles from "@/components/Particles";
import { api, type GameScore } from "@/lib/data";

const LIVES = 3;
const GAME_TIME = 30;

export default function SpelPage() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(GAME_TIME);
  const [pos, setPos] = useState(0); // 0-100 indicator position
  const [zoneSize, setZoneSize] = useState(24); // green zone width
  const [zoneCenter, setZoneCenter] = useState(50);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [name, setName] = useState("");
  const [best, setBest] = useState<GameScore[]>([]);
  const [personalBest, setPersonalBest] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [shake, setShake] = useState(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [perfects, setPerfects] = useState(0);

  const dir = useRef(1);
  const raf = useRef<number | null>(null);
  const lastTime = useRef<number>(0);
  const speed = useRef(1.2);

  const loadBest = useCallback(() => {
    api.getScores().then((s) => setBest(s.sort((a, b) => b.score - a.score).slice(0, 10)));
  }, []);
  useEffect(() => { loadBest(); const t = setInterval(loadBest, 10000); return () => clearInterval(t); }, [loadBest]);

  useEffect(() => {
    if (!running) return;
    if (time <= 0 || lives <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setTime((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [running, time, lives]);

  // moving indicator
  useEffect(() => {
    if (!running) return;
    const animate = (ts: number) => {
      if (!lastTime.current) lastTime.current = ts;
      const dt = (ts - lastTime.current) / 16;
      lastTime.current = ts;
      setPos((p) => {
        let np = p + dir.current * speed.current * dt;
        if (np >= 100) { np = 100; dir.current = -1; }
        if (np <= 0) { np = 0; dir.current = 1; }
        return np;
      });
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); lastTime.current = 0; };
  }, [running]);

  // speed up over time
  useEffect(() => {
    if (!running) return;
    speed.current = 1.2 + (GAME_TIME - time) * 0.08;
    setZoneSize(Math.max(8, 24 - Math.floor(score / 10)));
  }, [running, time, score]);

  const lift = () => {
    if (!running) { start(); return; }
    const half = zoneSize / 2;
    const inZone = pos >= zoneCenter - half && pos <= zoneCenter + half;
    const perfect = pos >= zoneCenter - 2 && pos <= zoneCenter + 2;

    if (inZone) {
      const pts = perfect ? 5 : 2;
      setScore((s) => s + pts);
      setCombo((c) => {
        const nc = c + 1;
        if (nc > maxCombo) setMaxCombo(nc);
        return nc;
      });
      if (perfect) {
        setPerfects((p) => p + 1);
        if (!achievements.includes("Perfect Timing")) setAchievements((a) => [...a, "Perfect Timing"]);
      }
      if (combo + 1 >= 10 && !achievements.includes("On Fire")) setAchievements((a) => [...a, "On Fire"]);
      setFlash("hit");
      setTimeout(() => setFlash(null), 150);
      // beep
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = perfect ? 880 : 660;
        g.gain.value = 0.08;
        o.start(); o.stop(ctx.currentTime + 0.06);
      } catch {}
    } else {
      setLives((l) => l - 1);
      setCombo(0);
      setFlash("miss");
      setShake(true);
      setTimeout(() => { setFlash(null); setShake(false); }, 200);
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

  const start = () => {
    setScore(0); setLives(LIVES); setTime(GAME_TIME); setRunning(true);
    setCombo(0); setMaxCombo(0); setPerfects(0); setAchievements([]);
    setZoneSize(24); setPos(0); dir.current = 1; speed.current = 1.2; lastTime.current = 0;
  };

  const save = async () => {
    if (!name) return;
    await api.addScore({ playerName: name, score, game: "deadlift" });
    loadBest();
    if (score > personalBest) setPersonalBest(score);
  };

  const pr = best.length > 0 ? best[0].score : 0;
  const title =
    score >= 60 ? "🏆 LEGENDARISCH!" :
    score >= 35 ? "🔥 ONSTOPBAAR!" :
    score >= 15 ? "💪 Sterk!" : "😅 Bryan doet dit met 1 hand";

  const gameOver = !running && (time <= 0 || lives <= 0) && (score > 0 || lives <= 0);

  return (
    <div className="relative min-h-screen">
      <Particles />
      <Nav />
      <main className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl md:text-5xl font-bold gradient-text mb-4 text-center">🏋️ DEADLIFT THE BABY</h1>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">1. Indicator beweegt over de barbell</div>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">2. Tik wanneer in groene zone (geel = 2pt, oranje = 5pt)</div>
        <div className="card p-3 mb-8 opacity-70 text-xs font-retro">3. Miss = leven verliezen. 3 levens, 30s</div>
        <div className={`card p-6 mb-6 transition ${shake ? "translate-x-1" : ""}`}>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="font-retro text-xs">SCORE: <span className="text-2xl">{score}</span></div>
            <div className="font-retro text-xs">COMBO: <span className="text-2xl">{combo}x</span></div>
            <div className="font-retro text-xs">LEVEN: <span className="text-2xl">{"❤️".repeat(Math.max(0, lives))}</span></div>
            <div className="font-retro text-xs">TIJD: <span className={`text-2xl ${time <= 5 ? "text-red-500 animate-pulse" : ""}`}>{time}</span></div>
          </div>

          {/* Timing bar - barbell style */}
          <div className="relative w-full h-24 mb-4 flex items-center">
            {/* left weight plates: smallest outside, largest near bar */}
            <div className="flex items-center gap-0.5 mr-0">
              <div className="w-4 h-12 bg-border/60" />
              <div className="w-6 h-16 bg-border/80" />
              <div className="w-8 h-20 bg-border" />
            </div>
            {/* bar */}
            <div className="relative flex-1 h-8 bg-border border-y-2 border-border overflow-hidden">
              {/* green zone */}
              <div
                className="absolute top-0 bottom-0 bg-accent2/60"
                style={{ left: `${zoneCenter - zoneSize / 2}%`, width: `${zoneSize}%` }}
              />
              {/* perfect zone */}
              <div
                className="absolute top-0 bottom-0 bg-accent"
                style={{ left: `${zoneCenter - 2}%`, width: "4%" }}
              />
              {/* indicator */}
              <div
                className={`absolute top-0 bottom-0 w-2 ${flash === "hit" ? "bg-green-400 shadow-[0_0_12px_#4ade80]" : flash === "miss" ? "bg-red-500 shadow-[0_0_12px_#ef4444]" : "bg-accent shadow-[0_0_8px_var(--accent)]"}`}
                style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
              />
            </div>
            {/* right weight plates: largest near bar, smallest outside */}
            <div className="flex items-center gap-0.5 ml-0">
              <div className="w-8 h-20 bg-border" />
              <div className="w-6 h-16 bg-border/80" />
              <div className="w-4 h-12 bg-border/60" />
            </div>
          </div>

          <div className="text-center text-xs opacity-60 mb-4 font-retro">GEWICHT GEHIEVEN: {score} KG</div>

          <button onClick={lift}
            className={`btn text-2xl px-12 py-6 w-full ${running ? "animate-pulse" : ""}`}>
            {running ? "LIFT!" : "START SPEL"}
          </button>

          {gameOver && (
            <div className="mt-4 space-y-3 text-center">
              <div className="font-display text-2xl">{title}</div>
              <div className="text-sm opacity-70">Score: {score} · Max combo: {maxCombo} · Perfects: {perfects}</div>
              {achievements.length > 0 && (
                <div className="flex gap-2 justify-center flex-wrap">
                  {achievements.map((a) => (
                    <span key={a} className="text-xs bg-accent2 text-[#2b1d12] px-2 py-1">🏅 {a}</span>
                  ))}
                </div>
              )}
              <input className="input max-w-xs mx-auto" placeholder="Jouw naam" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="flex gap-2 justify-center">
                <button className="btn" onClick={save}>Opslaan</button>
                <button className="btn btn-secondary" onClick={start}>Opnieuw</button>
              </div>
              {personalBest > 0 && <div className="text-xs opacity-60">Jouw PR: {personalBest} · Te verslaan: {pr}</div>}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-display text-2xl font-bold">🏆 Hall of Gains</h2>
          </div>
          {best.map((s, i) => (
            <div key={s.id} className={`flex justify-between items-center p-2 border-b-2 border-border ${i === 0 ? "bg-accent2/30" : ""}`}>
              <span className="font-retro text-xs">
                <span className="gradient-text">{i === 0 ? "#1" : i === 1 ? "#2" : i === 2 ? "#3" : `#${i+1}`}</span> {s.playerName}
              </span>
              <b className="font-retro gradient-text">{s.score}</b>
            </div>
          ))}
          {best.length === 0 && <p className="opacity-60 text-sm text-right">Nog geen lifters.</p>}
          {best.length > 0 && (
            <div className="mt-3 text-xs opacity-60">Te verslaan: {pr} (van {best[0].playerName})</div>
          )}
        </div>
      </main>
    </div>
  );
}