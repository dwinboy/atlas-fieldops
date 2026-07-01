import React from 'react';
import { Layers, CloudLightning, FileCheck, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface KPICardProps {
  title: string;
  value: string | number;
  badge: string;
  badgeColor: 'green' | 'teal' | 'red' | 'purple';
  iconType: 'layers' | 'sync' | 'check' | 'drift';
  footer: React.ReactNode;
}

export default function KPICard({ title, value, badge, badgeColor, iconType, footer }: KPICardProps) {
  
  // Icon picker
  const renderIcon = () => {
    switch (iconType) {
      case 'layers':
        return <Layers className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />;
      case 'sync':
        return <CloudLightning className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />;
      case 'check':
        return <FileCheck className="w-5 h-5 text-tertiary group-hover:scale-110 transition-transform" />;
      case 'drift':
        return <RefreshCw className="w-5 h-5 text-soft-purple group-hover:scale-110 transition-transform" />;
    }
  };

  // Color mapper
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'green': return 'text-secondary font-bold text-sm';
      case 'teal': return 'text-secondary font-bold text-sm';
      case 'red': return 'text-red-600 font-bold text-sm';
      case 'purple': return 'text-secondary font-bold text-sm';
      default: return 'text-outline font-bold text-sm';
    }
  };

  const getBorderHover = () => {
    switch (iconType) {
      case 'layers': return 'hover:border-primary';
      case 'sync': return 'hover:border-secondary';
      case 'check': return 'hover:border-tertiary';
      case 'drift': return 'hover:border-soft-purple';
    }
  };

  return (
    <div 
      className={`bg-white p-6 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-2 group transition-all duration-300 transform hover:-translate-y-1 ${getBorderHover()}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-outline uppercase tracking-wider">{title}</span>
        <div className="p-1.5 rounded bg-[#FAFAF8] text-[#101e1a]">
          {renderIcon()}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl font-bold text-[#101e1a] tracking-tight">{value}</span>
        <span className={getBadgeStyle()}>{badge}</span>
      </div>
      <div className="mt-2 w-full">
        {footer}
      </div>
    </div>
  );
}
