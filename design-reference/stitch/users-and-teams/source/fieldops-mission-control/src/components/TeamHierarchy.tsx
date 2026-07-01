import { Network } from 'lucide-react';
import { User } from '../types';

interface TeamHierarchyProps {
  users: User[];
  onTeamClick?: (teamName: string) => void;
}

export default function TeamHierarchy({ users, onTeamClick }: TeamHierarchyProps) {
  // Let's count user distributions dynamically
  const teamStats = [
    {
      id: 'agri-alpha',
      name: 'Agriculture Alpha',
      description: 'Environmental assessment & remediation squad.',
      borderClass: 'border-brand-primary-container hover:border-brand-primary'
    },
    {
      id: 'health-out',
      name: 'Health Outreach',
      description: 'Mobile medical units and diagnostic operations.',
      borderClass: 'border-brand-outline-variant hover:border-brand-primary'
    },
    {
      id: 'infra-delta',
      name: 'Infrastructure Delta',
      description: 'Civic engineering and utility restoration.',
      borderClass: 'border-brand-outline-variant hover:border-brand-primary'
    },
    {
      id: 'logi-echo',
      name: 'Logistics Echo',
      description: 'Supply chain management and procurement.',
      borderClass: 'border-brand-outline-variant hover:border-brand-primary'
    }
  ];

  return (
    <div className="bg-white border border-brand-outline-variant/40 rounded-xl p-5 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-brand-on-surface tracking-tight uppercase">Team Hierarchy</h3>
        <Network className="w-5 h-5 text-brand-primary" />
      </div>

      <div className="space-y-4">
        {teamStats.map((team) => {
          // Dynamic calculation of counts from current users state
          const count = users.filter(u => u.team === team.name).length;
          
          return (
            <div 
              key={team.id}
              onClick={() => onTeamClick && onTeamClick(team.name)}
              className={`
                group relative pl-4 border-l-2 hover:translate-x-1 cursor-pointer transition-all duration-300
                ${team.borderClass}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-brand-on-surface group-hover:text-brand-primary transition-colors">
                  {team.name}
                </p>
                <span className="text-[10px] font-bold text-brand-on-surface-variant bg-brand-surface-container-high/60 px-2 py-0.5 rounded border border-brand-outline-variant/10">
                  {count}
                </span>
              </div>
              <p className="text-[11px] text-brand-on-surface-variant/75 leading-tight">
                {team.description}
              </p>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => alert("Simulated: Expanding full FieldOps organizational tree. Total: 42 teams active.")}
        className="w-full mt-5 py-2.5 text-center text-xs font-bold text-brand-primary bg-brand-surface-container-low/40 hover:bg-brand-surface-container-low transition-colors rounded-lg border border-brand-outline-variant/20"
      >
        View All Teams
      </button>
    </div>
  );
}
