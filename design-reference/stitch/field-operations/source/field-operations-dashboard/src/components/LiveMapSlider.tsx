import React from 'react';
import { X, Navigation, Compass, Layers, ShieldCheck, MapPin } from 'lucide-react';
import { FieldTeam } from '../types';

interface LiveMapSliderProps {
  isOpen: boolean;
  onClose: () => void;
  teams: FieldTeam[];
}

export default function LiveMapSlider({ isOpen, onClose, teams }: LiveMapSliderProps) {
  return (
    <>
      {/* Sidebar Panel Slide-over */}
      <div 
        className={`
          fixed inset-y-0 right-0 w-full sm:w-110 lg:w-144 bg-[#0C1F1B] border-l border-brand-primary-container/20
          shadow-2xl z-50 transition-transform duration-500 ease-in-out flex flex-col text-white
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-brand-primary-container/20 flex items-center justify-between bg-[#081512]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#06B6D4]/10 text-[#06B6D4] rounded-lg">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-[#06B6D4]">
                High-Res GIS Live Map
              </h3>
              <p className="text-[10px] text-text-outline font-bold tracking-widest uppercase">
                Satellite telemetry overlay
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-text-outline hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close Map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Dark Mode Map Simulation */}
        <div className="flex-1 relative bg-[#060D0B] overflow-hidden flex items-center justify-center">
          {/* Grid lines layout to represent GIS coordination */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c251f_1px,transparent_1px),linear-gradient(to_bottom,#0c251f_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
          
          {/* Radial depth light */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,109,68,0.15)_0%,transparent_70%)]" />

          {/* SVG Map Illustration */}
          <svg className="w-full h-full opacity-60 pointer-events-none absolute" viewBox="0 0 400 400" fill="none">
            {/* Outline vectors */}
            <path d="M40 80 Q100 40 200 120 T360 80 T400 240 Q300 320 200 280 T80 340 Z" stroke="#006d44" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M80 120 C140 180 220 100 300 200" stroke="#06B6D4" strokeWidth="1" opacity="0.4" />
            {/* Concentric circles */}
            <circle cx="200" cy="200" r="140" stroke="#005232" strokeWidth="0.5" opacity="0.3" />
            <circle cx="200" cy="200" r="80" stroke="#005232" strokeWidth="0.5" opacity="0.3" />
          </svg>

          {/* Active Interactive Nodes representing Officers */}
          <div className="absolute top-1/4 left-1/3 text-center">
            {/* Pulse ripple */}
            <span className="absolute inline-flex h-8 w-8 rounded-full bg-[#06B6D4]/30 animate-ping -top-2 -left-2" />
            <div className="w-4 h-4 bg-[#06B6D4] rounded-full border border-black shadow-lg flex items-center justify-center relative cursor-pointer" onClick={() => alert("Agriculture Alpha Focus: Sector 4 Edge.")}>
              <span className="text-[8px] font-black text-black">A</span>
            </div>
            <span className="text-[10px] bg-[#0c251f]/90 border border-[#06B6D4]/30 px-2 py-0.5 rounded-md font-bold text-white block mt-2 whitespace-nowrap">
              Agri Alpha (Sector 4)
            </span>
          </div>

          <div className="absolute bottom-1/3 right-1/4 text-center">
            {/* Delayed Pulse ripple (red) */}
            <span className="absolute inline-flex h-8 w-8 rounded-full bg-brand-error/30 animate-ping -top-2 -left-2" />
            <div className="w-4 h-4 bg-brand-error rounded-full border border-black shadow-lg flex items-center justify-center relative cursor-pointer" onClick={() => alert("Health Outreach Focus: North Ridge Settlement.")}>
              <span className="text-[8px] font-black text-white">B</span>
            </div>
            <span className="text-[10px] bg-[#0c251f]/90 border border-brand-error/30 px-2 py-0.5 rounded-md font-bold text-white block mt-2 whitespace-nowrap">
              Health Beta (North Ridge)
            </span>
          </div>

          <div className="absolute top-1/2 right-1/3 text-center">
            {/* Completed Pulse ripple (green) */}
            <div className="w-4 h-4 bg-brand-primary-light rounded-full border border-black shadow-lg flex items-center justify-center relative cursor-pointer" onClick={() => alert("GIS Survey Focus: Southern Basin completed.")}>
              <span className="text-[8px] font-black text-black">G</span>
            </div>
            <span className="text-[10px] bg-[#0c251f]/90 border border-brand-primary-light/30 px-2 py-0.5 rounded-md font-bold text-white block mt-2 whitespace-nowrap">
              GIS Gamma (Completed)
            </span>
          </div>

          {/* Map Compass HUD */}
          <div className="absolute bottom-4 left-4 bg-[#081512]/90 border border-brand-primary-container/20 p-3 rounded-xl flex flex-col gap-1.5 backdrop-blur-xs max-w-44">
            <span className="text-[10px] text-[#06B6D4] font-extrabold uppercase tracking-widest">
              HUD STATUS
            </span>
            <div className="flex items-center gap-1.5 text-xs text-text-outline">
              <Layers className="w-3.5 h-3.5 text-brand-secondary" />
              <span className="text-white font-medium">3 Survey Nodes</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-outline">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-primary-light" />
              <span className="text-white font-medium">GIS Streams Online</span>
            </div>
          </div>
        </div>

        {/* Teams Metadata List Footer */}
        <div className="p-6 bg-[#081512] border-t border-brand-primary-container/20">
          <h4 className="text-xs font-extrabold text-text-outline uppercase tracking-wider mb-3">
            Active Geopolitical Surveys
          </h4>
          <div className="space-y-3">
            {teams.map((team) => (
              <div 
                key={team.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c251f]/40 border border-brand-primary-container/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#006d44]/30 flex items-center justify-center font-bold text-xs text-[#93ecb8]">
                    {team.letter}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{team.name}</p>
                    <p className="text-[10px] text-text-outline font-mono">{team.coords}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  team.status === 'On Track' ? 'bg-[#93ecb8]/10 text-[#93ecb8]' :
                  team.status === 'Delayed' ? 'bg-brand-error/10 text-brand-error' : 'bg-white/10 text-white'
                }`}>
                  {team.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
