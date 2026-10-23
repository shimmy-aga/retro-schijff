"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { api, type Config } from "@/lib/data";
import { HAIR_COLORS, EYE_COLORS } from "@/lib/colors";
import RetroSelect from "@/components/RetroSelect";

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PW || "tinylittledion";
const TOTAL_STEPS = 4;

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState<any>({});
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (authed) api.getConfig().then((c) => {
      setConfig(c); setForm(c);
      if (c.born) setStep(2);
    });
  }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold mb-4">Admin 🔐</h1>
          <input type="password" className="input mb-3" placeholder="Wachtwoord" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn btn-primary w-full" onClick={() => { if (pw === ADMIN_PW) setAuthed(true); else alert("Fout"); }}>Inloggen</button>
        </div>
      </div>
    );
  }

  const save = async () => {
    const updated = await api.saveConfig(form);
    setConfig(updated); setForm(updated);
  };

  const flip = async () => {
    const newBorn = !config?.born;
    const updated = await api.saveConfig({ born: newBorn });
    setConfig(updated); setForm(updated);
    if (newBorn) {
      setStep(2);
    } else {
      setStep(1);
    }
  };

  const tryResolve = async (cfg: any) => {
    if (cfg.born && cfg.birthDate && cfg.weight != null && cfg.length != null && cfg.gender && cfg.hair && cfg.eyes) {
      const r = await api.resolveBets();
      const c = await api.getConfig();
      setConfig(c); setForm(c);
      return r;
    }
    return null;
  };

  const goNext = async () => {
    const updated = await api.saveConfig(form);
    setConfig(updated); setForm(updated);
    if (step < TOTAL_STEPS) setStep(step + 1);
    // auto-resolve on final step
    if (step === TOTAL_STEPS - 1) {
      if (updated.birthDate && updated.weight != null && updated.length != null && updated.gender && updated.hair && updated.eyes) {
        const r = await api.resolveBets();
        alert("Bets resolved: " + JSON.stringify(r));
        const c = await api.getConfig();
        setConfig(c); setForm(c);
      }
    }
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold gradient-text mb-2">Admin Panel</h1>
        {config && (
          <div className="space-y-4">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div key={i} className={`flex-1 h-2 border-2 border-border ${i + 1 <= step ? "bg-accent" : "bg-card"}`} />
              ))}
            </div>
            <div className="text-xs opacity-60 mb-4">Stap {step} van {TOTAL_STEPS}</div>

            <div className="card p-6 transition-all duration-300">
              {step === 1 && (
                <div className="space-y-3">
                  <h2 className="font-display text-xl font-bold">Stap 1: Baby geboren?</h2>
                  <p className="text-sm opacity-70">Schakel naar "geboren" om de details in te vullen.</p>
                  <div className="flex items-center justify-between">
                    <span>Status: <b>{config.born ? "GEBOREN" : "Wachten"}</b></span>
                    <button className="btn btn-primary" onClick={flip}>{config.born ? "Terug naar wachten" : "Baby is er!"}</button>
                  </div>
                  {config.born && (
                    <button className="btn btn-secondary w-full" onClick={() => setStep(2)}>Volgende →</button>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold">Stap 2: Wanneer &amp; wie</h2>
                    <button className="btn btn-ghost text-xs" onClick={goBack}>← Terug</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Geboortedatum &amp; tijd</label>
                      <input type="datetime-local" className="input" value={form.birthDate ? form.birthDate.slice(0,16) : ""} onChange={(e) => setForm({ ...form, birthDate: new Date(e.target.value).toISOString() })} />
                    </div>
                    <div>
                      <label className="text-sm">Geslacht</label>
                      <RetroSelect value={form.gender ?? ""} onChange={(v) => setForm({ ...form, gender: v })} options={["jongen", "meisje"]} placeholder="Kies" />
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={goNext}>Volgende →</button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold">Stap 3: Metingen</h2>
                    <button className="btn btn-ghost text-xs" onClick={goBack}>← Terug</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Gewicht (kg)</label>
                      <input type="number" step="0.01" className="input" value={form.weight ?? ""} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-sm">Lengte (cm)</label>
                      <input type="number" step="0.1" className="input" value={form.length ?? ""} onChange={(e) => setForm({ ...form, length: Number(e.target.value) })} />
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={goNext}>Volgende →</button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold">Stap 4: Uiterlijk &amp; foto</h2>
                    <button className="btn btn-ghost text-xs" onClick={goBack}>← Terug</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Haarkleur</label>
                      <RetroSelect value={form.hair ?? ""} onChange={(v) => setForm({ ...form, hair: v })} options={HAIR_COLORS} placeholder="Kies" />
                    </div>
                    <div>
                      <label className="text-sm">Oogkleur</label>
                      <RetroSelect value={form.eyes ?? ""} onChange={(v) => setForm({ ...form, eyes: v })} options={EYE_COLORS} placeholder="Kies" />
                    </div>
                  </div>
                  <label className="text-sm">Naam</label>
                  <input className="input" value={form.babyName ?? ""} onChange={(e) => setForm({ ...form, babyName: e.target.value })} />
                  <label className="text-sm">Foto URL</label>
                  <input className="input" value={form.photoUrl ?? ""} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} />
                  <button className="btn btn-primary" onClick={save}>Opslaan</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}