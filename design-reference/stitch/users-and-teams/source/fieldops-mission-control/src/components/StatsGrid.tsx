import { Users, Network, Mail, ShieldCheck } from 'lucide-react';

interface StatsGridProps {
  totalActiveUsersCount: number;
  fieldTeamsCount: number;
  pendingInvitesCount: number;
  securityHealthStatus: string;
}

export default function StatsGrid({
  totalActiveUsersCount,
  fieldTeamsCount,
  pendingInvitesCount,
  securityHealthStatus
}: StatsGridProps) {
  const stats = [
    {
      id: 'active-users',
      label: 'Total Active Users',
      value: totalActiveUsersCount.toLocaleString(),
      icon: Users,
      colorClass: 'text-brand-primary'
    },
    {
      id: 'field-teams',
      label: 'Field Teams',
      value: fieldTeamsCount,
      icon: Network,
      colorClass: 'text-brand-primary'
    },
    {
      id: 'pending-invites',
      label: 'Pending Invites',
      value: pendingInvitesCount,
      icon: Mail,
      colorClass: 'text-brand-primary'
    },
    {
      id: 'security-health',
      label: 'Security Health',
      value: securityHealthStatus,
      icon: ShieldCheck,
      colorClass: 'text-brand-primary font-semibold'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="bg-white border border-brand-outline-variant/40 p-5 rounded-xl flex items-center gap-4 group hover:border-brand-primary hover:shadow-md transition-all duration-300 cursor-default"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-surface-container-low flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-on-surface-variant/70">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold tracking-tight mt-0.5 text-brand-on-surface ${stat.id === 'security-health' ? stat.colorClass : ''}`}>
                {stat.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
