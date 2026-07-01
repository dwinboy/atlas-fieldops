import { LayoutGrid, Globe, Users, RefreshCw, TrendingUp } from 'lucide-react';
import { KpiItem } from '../types';

interface KpiGridProps {
  kpiItems: KpiItem[];
  actualProjectsCount: number;
}

export default function KpiGrid({ kpiItems, actualProjectsCount }: KpiGridProps) {
  // Map string to icon component
  const getIcon = (name: string) => {
    switch (name) {
      case 'LayoutGrid':
        return <LayoutGrid className="w-5 h-5 text-primary" />;
      case 'Globe':
        return <Globe className="w-5 h-5 text-primary" />;
      case 'Users':
        return <Users className="w-5 h-5 text-primary" />;
      case 'RefreshCw':
        return <RefreshCw className="w-5 h-5 text-primary animate-spin-slow" />;
      default:
        return <LayoutGrid className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiItems.map((kpi, idx) => {
        // Dynamically override "Total Active Projects" value with the actual active project list length
        const displayValue = kpi.title === 'Total Active Projects' ? actualProjectsCount.toString() : kpi.value;

        return (
          <div
            key={idx}
            className="bg-surface-container-lowest border border-border-subtle p-5 rounded-2xl transition-all hover:border-primary-fixed hover:shadow-md hover:shadow-primary/5 duration-300 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-medium text-on-surface-variant/70 tracking-tight">
                {kpi.title}
              </span>
              <div className="w-9 h-9 rounded-xl bg-primary-container/10 flex items-center justify-center">
                {getIcon(kpi.iconName)}
              </div>
            </div>

            <div>
              <div className="text-3xl font-bold font-display text-primary tracking-tight mb-2">
                {displayValue}
              </div>

              {kpi.type === 'progress' && kpi.progressVal !== undefined && (
                <div className="w-full mt-3">
                  <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-1000 rounded-full"
                      style={{ width: `${kpi.progressVal}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {kpi.type === 'text' && kpi.subValue && (
                <div className={`flex items-center text-xs font-semibold ${kpi.trendUp ? 'text-secondary' : 'text-on-surface-variant/50'}`}>
                  {kpi.trendUp && <TrendingUp className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />}
                  {kpi.subValue}
                </div>
              )}

              {kpi.type === 'percentage' && kpi.subValue && (
                <div className="flex items-center text-xs font-bold text-secondary">
                  <span className="w-2 h-2 rounded-full bg-secondary mr-2 animate-ping"></span>
                  <span className="w-2 h-2 rounded-full bg-secondary absolute"></span>
                  {kpi.subValue}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
