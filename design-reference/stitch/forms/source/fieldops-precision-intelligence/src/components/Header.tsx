import React, { useState } from 'react';
import { Search, Bell, Settings, ChevronRight, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userEmail: string;
}

export default function Header({ activeTab, searchQuery, setSearchQuery, userEmail }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Map active tab ID to elegant label
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'projects': return 'Project Registry';
      case 'forms': return 'Forms Workspace';
      case 'operations': return 'Field Deployment';
      case 'mapping': return 'GIS Mapping';
      case 'analytics': return 'Telemetry & Analytics';
      default: return 'Forms';
    }
  };

  const notificationList = [
    { id: 1, title: 'Database Synced', body: 'All regional nodes report 100% sync integrity.', time: 'Just now' },
    { id: 2, title: 'Form Revised', body: 'v2.4.1 of Agriculture Baseline approved by HQ.', time: '2 hours ago' },
    { id: 3, title: 'Security Alert', body: 'Node 04 encryption protocols successfully verified.', time: '4 hours ago' }
  ];

  return (
    <header className="flex justify-between items-center px-8 w-full h-16 sticky top-0 z-40 bg-[#edfdf6] border-b border-[#E2E8F0]">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center text-sm font-semibold text-outline">
          <span className="hover:text-primary cursor-pointer transition-colors">Mission Control</span>
          <ChevronRight className="w-4 h-4 mx-1 text-outline/60" />
          <span className="text-primary font-bold">{getTabLabel(activeTab)}</span>
        </nav>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative flex items-center bg-surface-container-high px-4 py-1.5 rounded-full border border-[#E2E8F0] shadow-inner focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          <Search className="w-4 h-4 text-outline mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operational registry..."
            className="bg-transparent border-none text-sm placeholder:text-outline/80 w-64 focus:ring-0 text-[#101e1a]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-outline hover:text-primary ml-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 relative">
          {/* Notifications Button */}
          <button 
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setSettingsOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-[#3f4942] hover:text-primary relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-12 top-12 w-80 bg-white rounded-xl border border-border-subtle shadow-xl p-4 z-50 text-left">
              <div className="flex justify-between items-center border-b border-border-subtle pb-2 mb-2">
                <span className="font-bold text-sm text-primary">System Signals</span>
                <span className="text-xs text-outline">3 Unread</span>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {notificationList.map(n => (
                  <div key={n.id} className="text-xs hover:bg-[#FAFAF8] p-2 rounded transition-colors">
                    <div className="flex justify-between font-semibold text-[#101e1a] mb-1">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-outline font-normal">{n.time}</span>
                    </div>
                    <p className="text-outline">{n.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Button */}
          <button 
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setNotificationsOpen(false);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-[#3f4942] hover:text-primary"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Settings Dropdown */}
          {settingsOpen && (
            <div className="absolute right-2 top-12 w-64 bg-white rounded-xl border border-border-subtle shadow-xl p-4 z-50 text-left">
              <span className="font-bold text-sm text-primary block border-b border-border-subtle pb-2 mb-2">Node Environment</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-outline">Active User:</span>
                  <span className="font-medium text-[#101e1a]">Field Admin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Encryption:</span>
                  <span className="font-medium text-secondary">AES-256 Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Secure Mode:</span>
                  <span className="font-medium text-[#101e1a]">Strict SSL</span>
                </div>
                <div className="flex justify-between border-t border-border-subtle pt-2 mt-2 font-mono text-[10px] text-outline">
                  <span>SSL Fingerprint:</span>
                  <span className="text-right">FOP-992-SEC</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-3 border-l border-[#E2E8F0] pl-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-[#101e1a]">E. Ndiforngang</span>
            <span className="text-[10px] text-outline font-mono max-w-[130px] truncate">{userEmail}</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-fixed overflow-hidden border border-[#E2E8F0] shadow-sm cursor-pointer hover:opacity-90">
            <img 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLs-R1Qa1lX3IfFlJXWtVjCpaz5mL2VvzmX41Jv5exVZ38cj8AX-fMRzjxmC7-hioEZl5sI9MRlce93vBFUXRYvIWVEePm20pM4cXvmnex_KUC-jgRkx53p78DhWe-1rzd5syji6lw6C4874OOr2kZ6SAbUz7RneBAxgpPwuhB_lRZUBYJ8YpX_kQNNogcI40NshqOR3hugneTUw6xMo4V3aZPVIruoxQ1zl1-xGDQ7gPPBmidC4Bec4ScOfk3NXOOkJxvS4yUcw" 
              alt="Operator Profile"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
