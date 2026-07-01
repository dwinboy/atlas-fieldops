import { CheckCircle2 } from 'lucide-react';

export default function DataIntegrity() {
  return (
    <div className="bg-brand-deep-emerald-dark rounded-xl p-5 overflow-hidden relative group shadow-sm">
      {/* Mesh/Gradient overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-br from-brand-primary to-brand-cyan-accent mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 flex flex-col justify-between h-24">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          <p className="text-white font-semibold text-xs tracking-wide">Data Integrity Verified</p>
        </div>

        <div className="flex items-end justify-between mt-auto">
          {/* Dynamic visual equalizer representing data scans */}
          <div className="flex gap-1.5 items-end pb-1">
            <div className="w-1 h-4 bg-emerald-400/50 rounded-full animate-bounce [animation-duration:1s]" />
            <div className="w-1 h-7 bg-emerald-400 rounded-full animate-bounce [animation-duration:1.2s]" />
            <div className="w-1 h-5 bg-emerald-400/80 rounded-full animate-bounce [animation-duration:0.8s]" />
            <div className="w-1 h-3 bg-emerald-400/30 rounded-full animate-bounce [animation-duration:1.4s]" />
            <div className="w-1 h-6 bg-brand-cyan-accent rounded-full animate-bounce [animation-duration:1.1s]" />
          </div>

          <span className="text-[10px] font-mono tracking-widest text-emerald-300/60 font-semibold">
            OPS-992-SEC
          </span>
        </div>
      </div>
    </div>
  );
}
