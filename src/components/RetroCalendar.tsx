"use client";
import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  placeholder?: string;
  className?: string;
  error?: boolean;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export default function RetroCalendar({ value, onChange, min, placeholder = "Kies een datum", className = "", error = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = value ? new Date(value + "T00:00:00") : new Date();
  const [view, setView] = useState(initial);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (value) setView(new Date(value + "T00:00:00"));
  }, [value]);

  const minDate = min ? new Date(min + "T00:00:00") : null;

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = view.toLocaleString("nl-NL", { month: "long", year: "numeric" });

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`input w-full flex items-center justify-between text-left cursor-pointer ${open ? "shadow-[5px_5px_0_0_var(--accent)]" : ""} ${error ? "shake" : ""}`}
        style={error ? { boxShadow: "5px 5px 0 0 #dc2626", borderColor: "#dc2626" } : undefined}
      >
        <span className={value ? "text-foreground" : "opacity-60"}>{value || placeholder}</span>
        <Calendar size={16} className="shrink-0 ml-2 opacity-70" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card dark:bg-[#3a2a1f] border-4 border-border shadow-[5px_5px_0_0_var(--accent)] p-2 dropdown-in">
          <div className="absolute inset-0 bg-accent/10 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} className="px-2 py-2 min-h-[44px] font-retro text-xs hover:bg-accent2">◀</button>
            <span className="font-display text-sm font-bold capitalize">{monthName}</span>
            <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} className="px-2 py-2 min-h-[44px] font-retro text-xs hover:bg-accent2">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] opacity-60 mb-1">
            {["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const date = new Date(year, month, d);
              const iso = toISO(date);
              const disabled = minDate ? date < minDate : false;
              const selected = iso === value;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`py-2 min-h-[40px] text-xs font-retro border-2 ${selected ? "bg-accent text-white border-accent" : "border-border hover:bg-accent2"} ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
