import { Cpu, Activity, Briefcase, Users, LineChart, Shield, Settings, Plus, HelpCircle, LogOut } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onNewReportClick: () => void;
}

export default function Sidebar({ currentTab, onTabChange, onNewReportClick }: SidebarProps) {
  const menuItems = [
    { id: 'operations', label: 'Operations', icon: Activity },
    { id: 'assets', label: 'Assets', icon: Briefcase },
    { id: 'staff', label: 'Field Staff', icon: Users },
    { id: 'intelligence', label: 'Intelligence', icon: LineChart },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      id="app-sidebar"
      className="fixed left-0 top-0 h-full w-64 bg-deep-emerald-dark border-r border-outline-variant flex flex-col p-4 gap-4 z-50 text-white"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-4">
        <div className="w-10 h-10 rounded bg-primary flex items-center justify-center shadow-inner">
          <Cpu className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-sans text-lg font-extrabold text-primary-fixed leading-tight tracking-tight">
            FieldIntel Pro
          </h1>
          <p className="text-[10px] text-primary-fixed opacity-70 uppercase tracking-widest font-semibold">
            Enterprise Ops
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-tab-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-surface-variant hover:text-white hover:bg-primary/20'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Action Button */}
      <button
        id="btn-new-report"
        onClick={onNewReportClick}
        className="w-full bg-primary-fixed text-on-primary-fixed font-semibold text-sm py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-fixed-dim active:scale-95 transition-all cursor-pointer shadow-md"
      >
        <Plus className="w-4 h-4" />
        New Report
      </button>

      {/* Footer Options */}
      <div className="border-t border-outline-variant pt-4 space-y-1">
        <button
          id="btn-sidebar-support"
          className="w-full flex items-center gap-3 px-3 py-2.5 text-surface-variant hover:text-white text-sm font-semibold transition-colors duration-200 cursor-pointer text-left"
        >
          <HelpCircle className="w-5 h-5" />
          Support
        </button>
        <button
          id="btn-sidebar-logout"
          onClick={() => {
            if (window.confirm('Are you sure you want to log out of FieldIntel Pro?')) {
              window.alert('Logged out. Reload the app to start over.');
            }
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-surface-variant hover:text-white text-sm font-semibold transition-colors duration-200 cursor-pointer text-left"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
