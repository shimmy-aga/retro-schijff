export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="font-retro text-2xl animate-pulse">LADEN...</div>
      <div className="relative w-32 h-32">
        {/* Pokeball */}
        <div className="absolute inset-0 rounded-full border-4 border-border bg-white overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-accent" />
          <div className="absolute top-1/2 left-0 right-0 h-[4px] bg-border -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-border" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-border" />
        <div className="w-6 h-6 bg-accent border-2 border-border" />
        <div className="w-16 h-2 bg-border" />
      </div>
      <p className="text-sm opacity-60">Baby komt eraan...</p>
    </div>
  );
}