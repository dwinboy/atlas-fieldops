import { Search, Bell, HelpCircle, ChevronRight, Menu } from 'lucide-react';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  onNotificationsClick: () => void;
  onHelpClick: () => void;
}

export default function Header({
  searchTerm,
  setSearchTerm,
  activeNav,
  setActiveNav,
  onNotificationsClick,
  onHelpClick,
}: HeaderProps) {
  const navTabs = ['Projects', 'Operations', 'Archives'];

  return (
    <header className="h-16 flex justify-between items-center px-6 bg-surface/85 backdrop-blur-md border-b border-border-subtle glassmorphism-effect z-40 sticky top-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveNav('Projects')}>
          <h1 className="text-xl font-extrabold text-primary tracking-tight font-display">
            Atlas FieldOps
          </h1>
        </div>
        
        {/* Navigation Tabs (desktop only) */}
        <nav className="hidden lg:flex items-center gap-6 h-full">
          {navTabs.map((tab) => {
            const isActive = activeNav === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveNav(tab)}
                className={`py-5 text-sm font-semibold transition-all relative cursor-pointer ${
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant/70 hover:text-primary'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-6 flex-grow justify-end md:flex-grow-0">
        {/* Breadcrumbs (medium screens and up) */}
        <div className="hidden md:flex items-center text-xs text-on-surface-variant/60 font-semibold tracking-wide">
          <span>Mission Control</span>
          <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-on-surface-variant/40" />
          <span className="text-on-surface font-bold">Projects</span>
        </div>

        {/* Search bar */}
        <div className="relative h-10 w-full max-w-[200px] sm:max-w-xs md:w-64 bg-surface-container-low rounded-full flex items-center px-4 border border-outline-variant/30 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <Search className="w-4 h-4 text-outline mr-2" />
          <input
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm w-full text-on-surface placeholder:text-on-surface-variant/40"
            placeholder="Search assets..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-outline hover:text-primary font-bold px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onNotificationsClick}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full animate-pulse"></span>
          </button>
          
          <button
            onClick={onHelpClick}
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Help"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
