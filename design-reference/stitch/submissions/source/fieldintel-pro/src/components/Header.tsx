import { Search, Bell, History, HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  title: string;
  onNotificationClick: () => void;
  notificationCount: number;
}

export default function Header({
  searchQuery,
  onSearchChange,
  title,
  onNotificationClick,
  notificationCount,
}: HeaderProps) {
  const [showProfileCard, setShowProfileCard] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-outline-variant flex justify-between items-center px-8 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-8 flex-1">
        <h2 className="text-xl font-extrabold text-primary tracking-tight shrink-0">
          {title}
        </h2>
        
        {/* Global Search */}
        <div className="relative w-96 max-w-full hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4.5 h-4.5" />
          <input
            id="global-search-input"
            type="text"
            className="w-full pl-10 pr-4 py-1.5 bg-surface-container border border-outline-variant rounded-full text-sm text-on-background focus:ring-2 focus:ring-primary focus:bg-white focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/70 font-medium"
            placeholder="Search across operations, IDs, entities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')} 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant hover:text-primary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right Operations Utility */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-on-surface-variant">
          {/* Notifications */}
          <button
            id="btn-header-notifications"
            onClick={onNotificationClick}
            className="relative p-2 rounded-full hover:bg-surface-container transition-colors cursor-pointer active:scale-95 group"
            title="Notifications"
          >
            <Bell className="w-5 h-5 group-hover:text-primary transition-colors" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Audit History Log */}
          <button
            id="btn-header-history"
            onClick={() => alert('Operational Audit history is pristine. All transactions have been securely logged to local state.')}
            className="p-2 rounded-full hover:bg-surface-container transition-colors cursor-pointer active:scale-95 group"
            title="Audit History Logs"
          >
            <History className="w-5 h-5 group-hover:text-primary transition-colors" />
          </button>

          {/* Help Center */}
          <button
            onClick={() => alert('Welcome to FieldIntel Pro Help. Field Officers submit records from remote centers, and Ops Commanders verify compliance. Click on any record to inspect GPS coordinates, temperature logs, and attachments.')}
            className="p-2 rounded-full hover:bg-surface-container transition-colors cursor-pointer active:scale-95 group"
            title="Help & Guides"
          >
            <HelpCircle className="w-5 h-5 group-hover:text-primary transition-colors" />
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant"></div>

        {/* Commander Profile */}
        <div className="relative">
          <button
            id="btn-profile-dropdown"
            onClick={() => setShowProfileCard(!showProfileCard)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                Alex Rivera
              </p>
              <p className="text-[10px] text-on-surface-variant font-semibold">
                Ops Commander
              </p>
            </div>
            <img
              id="avatar-image"
              className="w-10 h-10 rounded-full border-2 border-primary/20 object-cover group-hover:border-primary/50 transition-colors"
              alt="Alex Rivera headshot"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-nN5NVHoEfFTXxCsmsKDsbyauwaAokqFdKg2h7D0cI-E4rC4lXPxFDvND-xcqWfiFYFRf1KfFbl2ozwz8sdvrsOA92-TXcRQAj_Awt-ZuA94RNMkh1lx5rYOLz7-F2i29rhiniNbd8KI_XRFsJRtyNW1JuEuJktiOQvARBNtyqwIcwXM34FvPSai4hrPupiup4NDz4tddgfRS0U6Fvrvj1MJdYXmDBViR3pGOa4U-G6qV351QvEuh_5A0BacW6dKXd98Ax0QwFw"
            />
          </button>

          {/* Expanded Profile Info Card */}
          {showProfileCard && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-outline-variant shadow-xl p-4 z-50 text-on-surface">
              <div className="flex items-center gap-3 border-b border-outline-variant pb-3 mb-3">
                <img
                  className="w-12 h-12 rounded-full object-cover border border-primary/20"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-nN5NVHoEfFTXxCsmsKDsbyauwaAokqFdKg2h7D0cI-E4rC4lXPxFDvND-xcqWfiFYFRf1KfFbl2ozwz8sdvrsOA92-TXcRQAj_Awt-ZuA94RNMkh1lx5rYOLz7-F2i29rhiniNbd8KI_XRFsJRtyNW1JuEuJktiOQvARBNtyqwIcwXM34FvPSai4hrPupiup4NDz4tddgfRS0U6Fvrvj1MJdYXmDBViR3pGOa4U-G6qV351QvEuh_5A0BacW6dKXd98Ax0QwFw"
                  alt="Alex Rivera headshot larger"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-bold text-sm text-primary">Alex Rivera</h4>
                  <p className="text-xs text-on-surface-variant font-medium">Ops Commander</p>
                  <p className="text-[10px] text-primary font-semibold mt-0.5">Active Session</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Role Type:</span>
                  <span className="font-semibold">Administrator</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Assigned Division:</span>
                  <span className="font-semibold">Sub-Saharan Cluster</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Email:</span>
                  <span className="font-semibold text-primary overflow-ellipsis overflow-hidden">rivera@intelpro.com</span>
                </div>
              </div>
              <div className="border-t border-outline-variant pt-2 mt-3 flex justify-end">
                <button
                  onClick={() => setShowProfileCard(false)}
                  className="text-xs font-semibold px-3 py-1 bg-surface-container hover:bg-surface-container-high rounded-full transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
