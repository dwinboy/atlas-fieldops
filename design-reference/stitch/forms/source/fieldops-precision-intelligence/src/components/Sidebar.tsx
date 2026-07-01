import React from 'react';
import { 
  LayoutDashboard, 
  FolderGit, 
  ClipboardList, 
  Construction, 
  Map, 
  LineChart, 
  HelpCircle, 
  LogOut,
  Database
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderGit },
    { id: 'forms', label: 'Forms', icon: ClipboardList },
    { id: 'operations', label: 'Field Operations', icon: Construction },
    { id: 'mapping', label: 'Mapping', icon: Map },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-white border-r border-[#E2E8F0] flex flex-col py-6 px-4 gap-4 z-50">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-primary leading-tight">FieldOps</h2>
          <p className="text-xs font-semibold text-outline tracking-wider uppercase">Precision Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                isActive
                  ? 'text-primary font-bold bg-[#e1f2eb] border-l-4 border-primary translate-x-1'
                  : 'text-[#3f4942] hover:bg-[#e7f7f1]/50 hover:text-primary'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${
                isActive ? 'text-primary' : 'text-[#3f4942]/80 group-hover:text-primary'
              }`} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Support / Logout */}
      <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-[#E2E8F0]">
        <button
          onClick={() => alert('Support portal is fully secure. Connecting to operations supervisor...')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#3f4942] hover:bg-[#e7f7f1]/50 hover:text-primary transition-all text-left group"
        >
          <HelpCircle className="w-5 h-5 text-[#3f4942]/80 group-hover:text-primary" />
          <span className="text-sm font-medium">Support</span>
        </button>
        <button
          onClick={() => {
            if(confirm('Are you sure you want to sign out of the secure FieldOps node?')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#3f4942] hover:bg-red-50 hover:text-red-600 transition-all text-left group"
        >
          <LogOut className="w-5 h-5 text-[#3f4942]/80 group-hover:text-red-600" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
