"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, ChevronDown, Menu, X, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/gok", label: "Gokken" },
];

const games = [
  { href: "/deadlift", label: "Deadlift" },
  { href: "/evolutie", label: "Evolutie" },
  { href: "/shooter", label: "Shooter" },
];

export default function Nav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isGame = games.some((g) => pathname === g.href);

  return (
    <header className="sticky top-0 z-50 bg-background border-b-4 border-border">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-retro text-sm md:text-base text-accent flex items-center gap-2">
          <span className="text-xl">👶</span> BABY
        </Link>
        {/* Desktop nav */}
        <nav className="hidden md:flex gap-2 flex-wrap items-center">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`font-retro text-xs px-3 py-3 min-h-[44px] border-2 border-border transition ${
                pathname === l.href
                  ? "bg-accent text-white shadow-[3px_3px_0_0_var(--border)]"
                  : "bg-card text-foreground hover:bg-accent2 hover:text-[#2b1d12] hover:shadow-[3px_3px_0_0_var(--border)]"
              }`}>
              {l.label.toUpperCase()}
            </Link>
          ))}
          <div ref={ref} className="relative">
            <button onClick={() => setOpen((o) => !o)}
               className={`font-retro text-xs px-3 py-3 min-h-[44px] border-2 border-border transition flex items-center gap-1 ${
                isGame
                  ? "bg-accent text-white shadow-[3px_3px_0_0_var(--border)]"
                  : "bg-card text-foreground hover:bg-accent2 hover:text-[#2b1d12] hover:shadow-[3px_3px_0_0_var(--border)]"
              }`}>
              GAMES <ChevronDown size={12} className={open ? "rotate-180" : ""} />
            </button>
            {open && (
              <div className="absolute top-full left-0 mt-1 bg-card border-4 border-border shadow-[4px_4px_0_0_var(--border)] min-w-[140px] z-50">
                {games.map((g) => (
                  <Link key={g.href} href={g.href} onClick={() => setOpen(false)}
                    className={`block font-retro text-xs px-3 py-2 border-b-2 border-border transition ${
                      pathname === g.href ? "bg-accent text-white" : "hover:bg-accent2 hover:text-[#2b1d12]"
                    }`}>
                    {g.label.toUpperCase()}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="flex items-center gap-2">
           <Link href="/admin" className="btn btn-ghost text-xs px-3 py-3 min-h-[44px]" title="Admin">
            <Settings size={14} />
          </Link>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="btn btn-ghost text-xs px-3 py-3 min-h-[44px]">
            {mounted && (theme === "dark" ? <Sun size={14} /> : <Moon size={14} />)}
          </button>
          {/* Hamburger */}
           <button onClick={() => setMenuOpen((o) => !o)} className="btn btn-ghost text-xs px-3 py-3 min-h-[44px] md:!hidden">
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-card border-b-4 border-border px-4 py-3 space-y-2 shadow-[0_8px_0_0_var(--border)] z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className={`block font-retro text-xs px-3 py-2 border-2 border-border ${
                pathname === l.href ? "bg-accent text-white" : "bg-background"
              }`}>
              {l.label.toUpperCase()}
            </Link>
          ))}
          <div className="font-retro text-xs opacity-60 pt-2">GAMES</div>
          {games.map((g) => (
            <Link key={g.href} href={g.href} onClick={() => setMenuOpen(false)}
              className={`block font-retro text-xs px-3 py-2 border-2 border-border ml-2 ${
                pathname === g.href ? "bg-accent text-white" : "bg-background"
              }`}>
              {g.label.toUpperCase()}
            </Link>
          ))}
          <Link href="/admin" onClick={() => setMenuOpen(false)}
            className={`block font-retro text-xs px-3 py-2 border-2 border-border ${
              pathname === "/admin" ? "bg-accent text-white" : "bg-background"
            }`}>
            ADMIN
          </Link>
        </div>
      )}
    </header>
  );
}