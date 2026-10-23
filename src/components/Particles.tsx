"use client";
import { useEffect, useState } from "react";

const EMOJIS = ["🍼", "🧬", "👶", "🍼", "🧬", "👶"];

export default function Particles() {
  const [items, setItems] = useState<{ id: number; left: number; top: number; emoji: string; delay: number }[]>([]);
  useEffect(() => {
    const arr = Array.from({ length: 8 }, (_, i) => {
      const side = i % 2 === 0 ? "left" : "right";
      const left = side === "left"
        ? 3 + Math.random() * 11
        : 86 + Math.random() * 11;
      return {
        id: i,
        left,
        top: Math.random() * 100,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        delay: Math.random() * 6,
      };
    });
    setItems(arr);
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {items.map((p) => (
        <span key={p.id} className="particle text-xl md:text-2xl" style={{ left: `${p.left}%`, top: `${p.top}%`, animationDelay: `${p.delay}s` }}>
          {p.emoji}
        </span>
      ))}
    </div>
  );
}