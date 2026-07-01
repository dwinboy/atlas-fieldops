import { LayoutDashboard, Network, LineChart, Map, Settings } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  onOpenSettings?: () => void;
}

export default function Sidebar({ activeSection, setActiveSection, onOpenSettings }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Network },
    { id: 'intelligence', label: 'Intelligence', icon: LineChart },
    { id: 'map', label: 'Map View', icon: Map },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full z-50 bg-deep-emerald-dark dark:bg-on-primary-fixed h-screen w-20 flex flex-col items-center py-8 border-r border-outline-variant/20 transition-all duration-300">
      {/* Logo */}
      <div className="mb-12 text-primary-fixed group relative cursor-pointer" onClick={() => setActiveSection('projects')}>
        <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary-fixed hover:scale-105 transition-transform">
          <Network className="w-6 h-6 stroke-[2.5]" />
        </div>
        <span className="absolute left-20 top-2 bg-deep-emerald-dark text-white text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          Atlas FieldOps
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col gap-6 flex-grow w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`group relative flex flex-col items-center justify-center p-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-primary-fixed bg-primary-container/20 shadow-md'
                  : 'text-surface-variant/60 hover:text-primary-fixed hover:bg-primary-container/5'
              }`}
            >
              <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-label-sm font-label-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute left-20 bg-deep-emerald-dark text-white px-3 py-1 rounded-r-lg whitespace-nowrap z-50 pointer-events-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-6 items-center">
        <button
          onClick={onOpenSettings}
          className="group relative flex flex-col items-center justify-center p-3 text-surface-variant/60 hover:text-primary-fixed hover:bg-primary-container/5 transition-colors duration-200 rounded-xl cursor-pointer"
        >
          <Settings className="w-5 h-5 transition-transform group-hover:rotate-45" />
          <span className="text-label-sm font-label-sm mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute left-20 bg-deep-emerald-dark text-white px-3 py-1 rounded-r-lg whitespace-nowrap z-50 pointer-events-none">
            Settings
          </span>
        </button>
        
        {/* User profile picture */}
        <div className="w-10 h-10 rounded-full border-2 border-primary-fixed overflow-hidden shadow-inner cursor-pointer hover:border-secondary transition-colors group relative">
          <img
            className="w-full h-full object-cover"
            alt="Professional executive"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWpMjI7TCbzwj_RGIAFWZjKKr_cOrvsLxByVb0dUweLzLUGWyioVeCZqBOkYZygSHf9NrY9KD8_QjJefrrxQ8Uli983wu2V-D8L732jYsDlpRJms-gjdEBzc04rA-8LfmTjMquDsSmnt1bUd5l5Iud9ciwbr5lNfDZdVDvkKTc54IQGyhwP0Y3me2wqcPeQmpua5cMGYQn_XGhWN-stOEPSKzBDxUiGmel7i69Y5Zie0_zdrX2Jjyd-uQiFShiCp5NqkR3cqJ0wQ"
          />
          <span className="absolute left-20 bottom-0 bg-deep-emerald-dark text-white text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-medium">
            Edwin Ndiforngang (Admin)
          </span>
        </div>
      </div>
    </nav>
  );
}
