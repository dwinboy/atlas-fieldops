import { 
  ShieldCheck, 
  LayoutDashboard, 
  Users, 
  Settings2, 
  FileSpreadsheet, 
  History, 
  LogOut, 
  X,
  Compass
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onShowAuditLog: () => void;
}

export default function Sidebar({ isOpen, onClose, activeTab, setActiveTab, onShowAuditLog }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users-teams', label: 'Users & Teams', icon: Users },
    { id: 'operations', label: 'Operations', icon: Settings2 },
    { id: 'intelligence', label: 'Intelligence', icon: Compass },
    { id: 'records', label: 'Records', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-brand-deep-emerald-dark text-brand-surface-variant py-6 px-4 gap-4 
        transition-transform duration-300 transform md:relative md:translate-x-0 md:flex flex-shrink-0 shadow-lg h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold text-lg text-brand-surface-container-lowest leading-tight tracking-wide">FieldOps</h1>
              <p className="text-xs font-semibold tracking-wider text-brand-primary-fixed-dim/60 uppercase">Mission Control</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white md:hidden transition-colors"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
                  ${isActive 
                    ? 'bg-brand-primary-container text-brand-on-primary-container shadow-sm translate-x-1 font-semibold' 
                    : 'text-brand-surface-variant hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-on-primary-container' : 'text-brand-outline-variant'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer Navigation Section */}
        <div className="mt-auto border-t border-white/10 pt-4 space-y-1">
          {/* System Status Display */}
          <div className="px-3 py-2.5 mb-2 bg-brand-primary/15 border border-brand-primary/20 rounded-lg">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-primary-fixed-dim">
              System Status
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
              <span className="text-sm font-semibold text-white tracking-wide">Live & Secure</span>
            </div>
          </div>

          <button 
            onClick={() => {
              onShowAuditLog();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-brand-surface-variant hover:text-white hover:bg-white/5 rounded-lg text-sm transition-all text-left"
          >
            <History className="w-4 h-4 text-brand-outline-variant" />
            Audit Log
          </button>

          <button 
            onClick={() => alert("Simulated logout from FieldOps Mission Control.")}
            className="w-full flex items-center gap-3 px-3 py-2 text-brand-surface-variant hover:text-red-300 hover:bg-red-950/20 rounded-lg text-sm transition-all text-left"
          >
            <LogOut className="w-4 h-4 text-brand-outline-variant" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
