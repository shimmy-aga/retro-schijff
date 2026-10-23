"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const DUE = new Date("2027-01-28T00:00:00+01:00");
const LMP = new Date(DUE.getTime() - 280 * 86400000);

function pad(n: number) { return String(n).padStart(2, "0"); }

export default function Countdown({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return null;
  const diff = DUE.getTime() - now.getTime();
  const born = diff <= 0;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const total = DUE.getTime() - LMP.getTime();
  const elapsed = now.getTime() - LMP.getTime();
  const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const week = Math.min(40, Math.max(1, Math.floor(elapsed / (7 * 86400000)) + 1));

  if (born) {
    return (
      <div className="text-center">
        <motion.h2 initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-display text-5xl gradient-text font-bold">
          Baby is er! 🎉
        </motion.h2>
      </div>
    );
  }

  const units = [
    { v: days, l: "dagen" },
    { v: hours, l: "uur" },
    { v: mins, l: "min" },
    { v: secs, l: "sec" },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2 md:gap-6">
        {units.map((u) => (
          <motion.div key={u.l} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="card px-3 py-2 md:px-6 md:py-4 text-center min-w-[60px] md:min-w-[70px]">
            <div className="font-display text-3xl md:text-5xl font-bold gradient-text">{pad(u.v)}</div>
            <div className="text-xs md:text-sm opacity-70 mt-1">{u.l}</div>
          </motion.div>
        ))}
      </div>
      {!compact && (
        <>
          <div className="w-full max-w-md">
            <div className="flex justify-between text-xs opacity-70 mb-1">
              <span>Week {week} van 40</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-card border-2 border-border overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-[#e85d2a] via-[#f5b700] to-[#ff6b9d]"
                initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} />
            </div>
          </div>
          <p className="text-sm opacity-70">Verwacht: 28 januari 2027</p>
        </>
      )}
    </div>
  );
}