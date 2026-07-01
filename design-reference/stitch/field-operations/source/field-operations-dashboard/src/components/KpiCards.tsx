import React from 'react';
import { Users, CheckSquare, RefreshCw, AlertTriangle } from 'lucide-react';
import { KpiCardData } from '../types';

interface KpiCardsProps {
  cards: KpiCardData[];
}

export default function KpiCards({ cards }: KpiCardsProps) {
  const getIcon = (iconName: string, colorClass: string) => {
    switch (iconName) {
      case 'Users': return <Users className={`w-5 h-5 ${colorClass}`} />;
      case 'CheckSquare': return <CheckSquare className={`w-5 h-5 ${colorClass}`} />;
      case 'RefreshCw': return <RefreshCw className={`w-5 h-5 ${colorClass}`} />;
      case 'AlertTriangle': return <AlertTriangle className={`w-5 h-5 ${colorClass}`} />;
      default: return <Users className={`w-5 h-5 ${colorClass}`} />;
    }
  };

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'primary':
        return {
          iconBg: 'bg-brand-primary/10',
          iconColor: 'text-brand-primary',
          titleColor: 'text-brand-primary',
          borderHover: 'hover:border-brand-primary/40',
        };
      case 'secondary':
        return {
          iconBg: 'bg-brand-secondary/10',
          iconColor: 'text-brand-secondary',
          titleColor: 'text-brand-secondary',
          borderHover: 'hover:border-brand-secondary/40',
        };
      case 'cyan':
        return {
          iconBg: 'bg-[#06B6D4]/10',
          iconColor: 'text-[#06B6D4]',
          titleColor: 'text-[#06B6D4]',
          borderHover: 'hover:border-[#06B6D4]/40',
        };
      case 'error':
        return {
          iconBg: 'bg-brand-error-container/80',
          iconColor: 'text-brand-error',
          titleColor: 'text-brand-error',
          borderHover: 'hover:border-brand-error/40',
        };
      default:
        return {
          iconBg: 'bg-surface-mid',
          iconColor: 'text-text-main',
          titleColor: 'text-text-muted',
          borderHover: 'hover:border-text-outline',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const styles = getVariantStyles(card.variant);
        return (
          <div
            key={card.id}
            className={`bg-surface-lowest p-6 rounded-2xl border border-text-border shadow-shard transition-all duration-300 ${styles.borderHover} group hover:-translate-y-0.5`}
          >
            <div className="flex justify-between items-center mb-4">
              <span className={`p-2.5 rounded-xl ${styles.iconBg} transition-transform duration-300 group-hover:scale-105`}>
                {getIcon(card.icon, styles.iconColor)}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider ${styles.titleColor}`}>
                {card.title}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-text-main">
                {card.value}
              </span>
              {card.total && (
                <span className="text-xs font-medium text-text-outline">
                  {card.unit ? `${card.unit} ` : ''}{card.total}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
