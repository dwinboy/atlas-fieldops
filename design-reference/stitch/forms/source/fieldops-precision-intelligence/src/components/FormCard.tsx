import React from 'react';
import { History, Calendar, CheckSquare } from 'lucide-react';
import { Form } from '../types';

interface FormCardProps {
  key?: string;
  form: Form;
  onSelect: (form: Form) => void;
}

export default function FormCard({ form, onSelect }: FormCardProps) {
  
  // Custom badges depending on sector
  const getSectorBadge = (sector: string) => {
    switch (sector) {
      case 'AGRI':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase">AGRI</span>;
      case 'HEALTH':
        return <span className="bg-blue-50 text-[#2f2ebf] border border-blue-200/50 px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase">HEALTH</span>;
      case 'RETAIL':
        return <span className="bg-teal-50 text-[#006f66] border border-teal-200/50 px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase">RETAIL</span>;
      case 'LOGISTICS':
        return <span className="bg-[#e1e0ff] text-[#2f2ebe] border border-[#c0c1ff]/50 px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase">LOGISTICS</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase">{sector}</span>;
    }
  };

  return (
    <div 
      onClick={() => onSelect(form)}
      className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:shadow-lg hover:border-primary/40 cursor-pointer transition-all duration-300 group flex flex-col md:flex-row gap-6 relative overflow-hidden"
    >
      {/* Sector Badge */}
      <div className="absolute top-4 right-4 z-10">
        {getSectorBadge(form.sector)}
      </div>

      {/* Form Thumbnail Image */}
      <div className="w-full md:w-48 h-32 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden border border-[#E2E8F0] shrink-0">
        <img 
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" 
          src={form.image} 
          alt={form.name}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Form Metadata and Analytics */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5 pr-16">
            <h3 className="text-base font-bold text-[#101e1a] group-hover:text-primary transition-colors line-clamp-1">
              {form.name}
            </h3>
            {form.verified && (
              <span className="material-symbols-outlined text-[16px] text-[#006a61] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-outline mb-4">
            <span className="flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-outline/75" />
              {form.version}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-outline/75" />
              {form.createdDate}
            </span>
            <span className="text-[10px] bg-[#edfdf6] text-primary px-1.5 py-0.5 rounded border border-[#e1f2eb] font-semibold">
              {form.fields.length} fields
            </span>
          </div>
        </div>

        {/* Submissions Stats & Sparkline */}
        <div className="flex items-end justify-between border-t border-[#FAFAF8] pt-3">
          <div>
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-0.5">Submissions</span>
            <span className="text-xl font-bold text-[#101e1a]">
              {form.submissionsCount.toLocaleString()}
            </span>
          </div>

          {/* Dynamic Sparkline rendering based on form trend array */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-semibold text-outline uppercase tracking-wider mb-1">Activity Trend</span>
            <div className="h-8 w-24 flex items-end gap-[3px]">
              {form.trend.map((val, idx) => {
                // Map val (e.g. 0-100) to height percentage
                const heightPercent = `${Math.max(15, val)}%`;
                return (
                  <div
                    key={idx}
                    className="w-[6px] bg-[#006a61] rounded-t-[1.5px] transition-all duration-500 group-hover:bg-primary"
                    style={{ height: heightPercent }}
                    title={`Relative activity: ${val}%`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
