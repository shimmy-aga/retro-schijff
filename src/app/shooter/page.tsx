"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Nav from "@/components/Nav";
import Particles from "@/components/Particles";
import { api, type GameScore } from "@/lib/data";

const W = 480;
const H = 640;

type Bullet = { x: number; y: number; vy: number; fromPlayer: boolean };
type Enemy = { x: number; y: number; w: number; h: number; hp: number; type: string; vx: number; vy: number; score: number };
type PowerUp = { x: number; y: number; vy: number; kind: string };

export default function ShooterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [best, setBest] = useState<GameScore[]>([]);
  const [name, setName] = useState("");
  const [personalBest, setPersonalBest] = useState(0);
  const [wave, setWave] = useState(1);
  const requestFrameRef = useRef<(() => void) | null>(null);

  const stateRef = useRef({
    player: { x: W / 2, y: H - 40, w: 32, h: 24, cooldown: 0, rapid: 0, spread: 0, shield: 0 },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    powerups: [] as PowerUp[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    keys: {} as Record<string, boolean>,
    keysJustPressed: {} as Record<string, boolean>,
    score: 0,
    lives: 3,
    wave: 1,
    waveTimer: 0,
    spawnTimer: 0,
    running: false,
    gameOver: false,
    combo: 0,
    comboTimer: 0,
  });

  const loadBest = useCallback(() => {
    api.getScores().then((s) => setBest(s.filter((x) => x.game === "shooter").sort((a, b) => b.score - a.score).slice(0, 10)));
  }, []);
  useEffect(() => { loadBest(); }, []);

  const beep = (freq: number, dur = 0.05) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq; g.gain.value = 0.06;
      o.start(); o.stop(ctx.currentTime + dur);
    } catch {}
  };

  const spawnWave = (st: typeof stateRef.current) => {
    const w = st.wave;
    const rows = Math.min(2 + Math.floor(w / 2), 5);
    const cols = Math.min(6 + Math.floor(w / 3), 10);
    const types = [" diaper", "craving", "sleep"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        st.enemies.push({
          x: 40 + c * 42,
          y: 40 + r * 36 - 200,
          w: 28,
          h: 24,
          hp: 1 + Math.floor(w / 4),
          type: types[(r + c) % types.length],
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.2 + w * 0.05,
          score: 10 + w * 2,
        });
      }
    }
  };

  const start = () => {
    const st = stateRef.current;
    st.player = { x: W / 2, y: H - 40, w: 32, h: 24, cooldown: 30, rapid: 0, spread: 0, shield: 0 };
    st.bullets = [];
    st.enemies = [];
    st.powerups = [];
    st.particles = [];
    st.score = 0;
    st.lives = 3;
    st.wave = 1;
    st.waveTimer = 0;
    st.spawnTimer = 0;
    st.running = true;
    st.gameOver = false;
    st.combo = 0;
    st.comboTimer = 0;
    st.keys = {};
    st.keysJustPressed = {};
    spawnWave(st);
    setScore(0); setLives(3); setWave(1); setGameOver(false); setRunning(true);
    requestFrameRef.current?.();
  };

  useEffect(() => {
    // warm up emoji fonts
    try {
      const c = document.createElement("canvas");
      const x = c.getContext("2d");
      if (x) {
        x.font = "24px serif";
        x.fillText("👾🍼👶⚡✨🛡️", 0, 24);
      }
    } catch {}
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let disposed = false;
    let framePending = false;

    const scheduleFrame = () => {
      if (disposed || framePending) return;
      framePending = true;
      raf = requestAnimationFrame(() => {
        framePending = false;
        loop();
      });
    };
    requestFrameRef.current = scheduleFrame;

    const handleKey = (e: KeyboardEvent, down: boolean) => {
      if (down) {
        if (!stateRef.current.keys[e.key]) stateRef.current.keysJustPressed[e.key] = true;
      }
      stateRef.current.keys[e.key] = down;
      if (e.key === " " && down) { e.preventDefault(); }
    };
    const kd = (e: KeyboardEvent) => handleKey(e, true);
    const ku = (e: KeyboardEvent) => handleKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // touch
    const touchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) * (W / rect.width);
        stateRef.current.player.x = Math.max(16, Math.min(W - 16, x));
      }
    };
    canvas.addEventListener("touchmove", touchMove, { passive: true });
    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) * (W / rect.width);
        stateRef.current.player.x = Math.max(16, Math.min(W - 16, x));
      }
      // shoot
      if (stateRef.current.running && !stateRef.current.gameOver) {
        const p = stateRef.current.player;
        if (p.cooldown <= 0) {
          stateRef.current.bullets.push({ x: p.x, y: p.y - 12, vy: -8, fromPlayer: true });
          if (p.spread > 0) {
            stateRef.current.bullets.push({ x: p.x - 8, y: p.y - 8, vy: -7, fromPlayer: true });
            stateRef.current.bullets.push({ x: p.x + 8, y: p.y - 8, vy: -7, fromPlayer: true });
          }
          p.cooldown = p.rapid > 0 ? 6 : 12;
          beep(660, 0.03);
        }
      }
    }, { passive: true });

    const loop = () => {
      const st = stateRef.current;
      if (st.running && !st.gameOver) {
        const p = st.player;
        // movement
        const shooting = !!(st.keys[" "] || st.keys["ArrowUp"]);
        const speed = shooting ? 1.5 : 3;
        if (st.keys["ArrowLeft"] || st.keys["a"]) p.x = Math.max(16, p.x - speed);
        if (st.keys["ArrowRight"] || st.keys["d"]) p.x = Math.min(W - 16, p.x + speed);
        // shoot: auto-fire while held; normal rate sensical, rapid powerup = faster
        const wantsShoot = st.keys[" "] || st.keys["ArrowUp"];
        if (wantsShoot && p.cooldown <= 0) {
          st.bullets.push({ x: p.x, y: p.y - 12, vy: -8, fromPlayer: true });
          if (p.spread > 0) {
            st.bullets.push({ x: p.x - 8, y: p.y - 8, vy: -7, fromPlayer: true });
            st.bullets.push({ x: p.x + 8, y: p.y - 8, vy: -7, fromPlayer: true });
          }
          p.cooldown = p.rapid > 0 ? 8 : 24;
          beep(660, 0.03);
        }
        if (p.cooldown > 0) p.cooldown--;
        if (p.rapid > 0) p.rapid--;
        if (p.spread > 0) p.spread--;
        if (p.shield > 0) p.shield--;

        // combo timer
        if (st.comboTimer > 0) { st.comboTimer--; if (st.comboTimer === 0) st.combo = 0; }

        // bullets
        st.bullets = st.bullets.filter((b) => {
          b.y += b.vy;
          return b.y > -10 && b.y < H + 10;
        });

        // enemies
        st.enemies.forEach((e) => {
          e.x += e.vx;
          e.y += e.vy;
          if (e.x < 0 || e.x + e.w > W) e.vx *= -1;
        });
        // remove enemies that reached bottom
        st.enemies = st.enemies.filter((e) => {
          if (e.y + e.h >= H - 20) {
            st.lives--;
            st.combo = 0;
            beep(150, 0.2);
            if (st.lives <= 0) { st.gameOver = true; st.running = false; setGameOver(true); setRunning(false); }
            return false;
          }
          return true;
        });

        // collisions: bullets vs enemies
        st.bullets.forEach((b) => {
          if (!b.fromPlayer) return;
          st.enemies.forEach((e) => {
            if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
              e.hp--;
              b.y = -100; // remove bullet
              if (e.hp <= 0) {
                st.score += e.score * (1 + st.combo * 0.1);
                st.combo++;
                st.comboTimer = 120;
                // particles
                for (let i = 0; i < 8; i++) {
                  st.particles.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 20, color: "#f5b700" });
                }
                // powerup drop (10% chance)
                if (Math.random() < 0.1) {
                  const kinds = ["rapid", "spread", "shield"];
                  st.powerups.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vy: 1.5, kind: kinds[Math.floor(Math.random() * kinds.length)] });
                }
                e.y = H + 100; // remove
              }
              beep(440, 0.03);
            }
          });
        });
        st.enemies = st.enemies.filter((e) => e.y < H + 50);

        // powerups
        st.powerups = st.powerups.filter((pu) => {
          pu.y += pu.vy;
          // collision with player
          if (pu.x >= p.x - p.w / 2 && pu.x <= p.x + p.w / 2 && pu.y >= p.y - p.h / 2 && pu.y <= p.y + p.h / 2) {
            if (pu.kind === "rapid") p.rapid = 300;
            if (pu.kind === "spread") p.spread = 300;
            if (pu.kind === "shield") p.shield = 300;
            beep(880, 0.1);
            return false;
          }
          return pu.y < H;
        });

        // particles
        st.particles = st.particles.filter((pt) => {
          pt.x += pt.vx; pt.y += pt.vy; pt.life--;
          return pt.life > 0;
        });

        // wave check
        if (st.enemies.length === 0) {
          st.waveTimer++;
          if (st.waveTimer > 60) {
            st.wave++;
            st.waveTimer = 0;
            spawnWave(st);
            setWave(st.wave);
          }
        }

        setScore(Math.floor(st.score));
        setLives(st.lives);
      }

      // draw
      ctx.fillStyle = "#1a120b";
      ctx.fillRect(0, 0, W, H);

      ctx.textBaseline = "middle";

      // scanlines
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

      // particles
      st.particles.forEach((pt) => {
        ctx.globalAlpha = pt.life / 20;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 3, 3);
      });
      ctx.globalAlpha = 1;

      // enemies
      st.enemies.forEach((e) => {
        // icon only, no box
        ctx.fillStyle = "#ffffff";
        ctx.font = "24px serif";
        ctx.textAlign = "center";
        ctx.fillText("👾", e.x + e.w / 2, e.y + e.h / 2);
        ctx.textAlign = "left";
      });

      // powerups
      st.powerups.forEach((pu) => {
        const emoji = pu.kind === "rapid" ? "⚡" : pu.kind === "spread" ? "✨" : "🛡️";
        ctx.fillStyle = "#ffffff";
        ctx.font = "18px serif";
        ctx.textAlign = "center";
        ctx.fillText(emoji, pu.x, pu.y);
        ctx.textAlign = "left";
      });

      // player
      const p = st.player;
      ctx.fillStyle = "#ffffff";
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.fillText("👶", p.x, p.y);
      if (p.shield > 0) {
        ctx.strokeStyle = "#4ecdc4";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.textAlign = "left";

      // bullets
      st.bullets.forEach((b) => {
        if (!b.fromPlayer) return;
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        ctx.fillText("🍼", b.x, b.y);
        ctx.textAlign = "left";
      });

      // HUD
      ctx.fillStyle = "#f5b700";
      ctx.font = "12px monospace";
      ctx.fillText(`SCORE: ${Math.floor(st.score)}`, 8, 16);
      ctx.fillText(`WAVE: ${st.wave}`, 8, 32);
      ctx.fillText(`COMBO: x${st.combo}`, W - 80, 16);
      ctx.fillText(`LIVES: ${"♥".repeat(st.lives)}`, W - 80, 32);

      if (st.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#e85d2a";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
        ctx.fillStyle = "#f5b700";
        ctx.font = "14px monospace";
        ctx.fillText(`SCORE: ${Math.floor(st.score)}`, W / 2, H / 2 + 10);
        ctx.textAlign = "left";
      }

      scheduleFrame();
    };

    const startLoop = () => {
      scheduleFrame();
    };
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(startLoop);
    } else {
      startLoop();
    }

    return () => {
      disposed = true;
      requestFrameRef.current = null;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("touchmove", touchMove);
    };
  }, []);

  const save = async () => {
    if (!name) return;
    await api.addScore({ playerName: name, score, game: "shooter" });
    loadBest();
    if (score > personalBest) setPersonalBest(score);
  };

  return (
    <div className="relative min-h-screen">
      <Particles />
      <Nav />
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-10 text-center">
        <h1 className="font-display text-3xl md:text-5xl font-bold gradient-text mb-4">🔫 BABY DEFENDERS</h1>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">1. Pijltjes/A/D = bewegen, Spatie = schieten</div>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">2. Touch: sleep om te bewegen, tap om te schieten</div>
        <div className="card p-3 mb-3 opacity-70 text-xs font-retro">3. Ruim alle vijanden op voor volgende golf</div>
        <div className="card p-3 mb-8 opacity-70 text-xs font-retro">4. Power-ups: ⚡ rapid, ✨ spread, 🛡️ shield</div>

        <div className="card p-4 mb-4 inline-block">
          <canvas ref={canvasRef} width={W} height={H} className="border-4 border-border max-w-full h-auto" style={{ imageRendering: "pixelated" }} />
        </div>

        {!running && !gameOver && (
          <button onClick={start} className="btn text-2xl px-12 py-6">START</button>
        )}
        {gameOver && (
          <div className="space-y-3">
            <div className="font-display text-2xl">GAME OVER — {score} pts</div>
            <input className="input max-w-xs mx-auto" placeholder="Jouw naam" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2 justify-center">
              <button className="btn" onClick={save}>Opslaan</button>
              <button className="btn btn-secondary" onClick={start}>Opnieuw</button>
            </div>
            {personalBest > 0 && <div className="text-xs opacity-60">Jouw PR: {personalBest}</div>}
          </div>
        )}

        <div className="card p-6 mt-6 text-left">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-display text-2xl font-bold">🏆 Hall of Defenders</h2>
          </div>
          {best.map((s, i) => (
            <div key={s.id} className={`flex justify-between items-center p-2 border-b-2 border-border ${i === 0 ? "bg-accent2/30" : ""}`}>
              <span className="font-retro text-xs">
                <span className="gradient-text">{i === 0 ? "#1" : i === 1 ? "#2" : i === 2 ? "#3" : `#${i + 1}`}</span> {s.playerName}
              </span>
              <b className="font-retro gradient-text">{s.score}</b>
            </div>
          ))}
          {best.length === 0 && <p className="opacity-60 text-sm text-left">Nog geen defenders.</p>}
        </div>
      </main>
    </div>
  );
}
