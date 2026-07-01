import { 
  Search, 
  Bell, 
  Settings, 
  HelpCircle, 
  Menu 
} from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  globalSearch: string;
  setGlobalSearch: (val: string) => void;
  onNotificationClick: () => void;
  notificationCount: number;
}

export default function TopBar({ 
  onMenuClick, 
  globalSearch, 
  setGlobalSearch,
  onNotificationClick,
  notificationCount
}: TopBarProps) {
  return (
    <header className="flex justify-between items-center w-full px-4 md:px-8 h-16 bg-white border-b border-brand-outline-variant/40 z-40 shadow-sm">
      {/* Search Input (Global) & Mobile Hamburger */}
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-brand-on-surface-variant hover:bg-brand-surface-container-low transition-colors rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden lg:flex items-center bg-brand-surface-container-low border border-brand-outline-variant/40 rounded-full px-4 py-1.5 w-80 shadow-inner focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all">
          <Search className="w-4 h-4 text-brand-on-surface-variant mr-2" />
          <input 
            type="text" 
            placeholder="Global command search..." 
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full p-0 text-brand-on-surface placeholder:text-brand-on-surface-variant/50 focus:ring-0 focus:outline-none"
          />
          <span className="text-[10px] font-bold text-brand-outline border border-brand-outline/30 px-1.5 py-0.5 rounded ml-2 bg-white">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right controls: Notifications, Settings, Help, Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <button 
            onClick={onNotificationClick}
            className="p-2 text-brand-on-surface-variant hover:bg-brand-surface-container-low transition-colors rounded-full relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-error border-2 border-white rounded-full animate-pulse" />
            )}
          </button>

          {/* Settings */}
          <button 
            onClick={() => alert("Settings panel mock: Operational settings, tactical keys, and system configuration.")}
            className="p-2 text-brand-on-surface-variant hover:bg-brand-surface-container-low transition-colors rounded-full"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Help */}
          <button 
            onClick={() => alert("FieldOps Mission Control Help Center: Standard Operating Procedures (SOP), communication frequencies, and tactical user guides.")}
            className="p-2 text-brand-on-surface-variant hover:bg-brand-surface-container-low transition-colors rounded-full"
            aria-label="Help Center"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-8 w-[1px] bg-brand-outline-variant/40 mx-1 md:mx-2"></div>

        {/* Commander Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-brand-on-surface leading-none">Commander Atlas</p>
            <p className="text-[11px] font-medium text-brand-on-surface-variant/75 mt-1">Super Admin</p>
          </div>
          <img 
            className="w-10 h-10 rounded-full border-2 border-brand-primary object-cover shadow-sm hover:scale-105 transition-transform"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKsjO4LYe_B0_mYLpW4lNEuW-KDL9fS1OIAZ_lK4ofk6vce_xsIYo8rBDlJez7crXboSoMFZ3Z7PqzyU74_fMGWk7ZndT0J2HPF_Xo6TklJijdlLpnNh3s931NXZARl6V-czxPGTDATwuIJ4rLHf7UvQw9VYmjiPYj-mRY2b3lfGj7BwqFZ7bKtBMKEFF9CSUDYbcML-5wXCuTT-KnfmLrvh7Lej8H5Ttnvc1GAlXkGr3O6RzyqWXoCDg3iuPyR7732D5d8zblAQ" 
            alt="Commander Atlas"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
