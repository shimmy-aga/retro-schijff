"use client";
import { useState, useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  error?: boolean;
};

/** Custom retro-styled select (no native dropdown popup). */
export default function RetroSelect({ value, onChange, options, placeholder = "Kies", className = "", error = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = options.find((o) => o === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`input w-full flex items-center justify-between text-left cursor-pointer ${open ? "shadow-[5px_5px_0_0_var(--accent)]" : ""} ${error ? "shake" : ""}`}
        style={error ? { boxShadow: "5px 5px 0 0 #dc2626", borderColor: "#dc2626" } : undefined}
      >
        <span className={current ? "text-foreground" : "opacity-60"}>{current ?? placeholder}</span>
        <span className="flex flex-col gap-[3px] shrink-0 ml-2">
          <span className="block w-0 h-0 border-l-[4px] border-r-[4px] border-b-[5px] border-l-transparent border-r-transparent border-b-current" />
        </span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-card border-4 border-border shadow-[5px_5px_0_0_var(--accent)] dropdown-in">
  <div className="absolute inset-0 bg-accent/10 pointer-events-none" />
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`block w-full text-left px-3 py-3 min-h-[44px] border-b-2 border-border font-retro text-xs hover:bg-accent2 hover:text-[#2b1d12] transition-colors ${o === value ? "bg-accent text-white hover:bg-accent" : "text-foreground"}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
