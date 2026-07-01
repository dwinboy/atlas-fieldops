import React from 'react';
import { 
  LayoutDashboard, 
  FolderHeart, 
  ClipboardList, 
  Construction, 
  Map, 
  BarChart3, 
  HelpCircle, 
  LogOut,
  X
} from 'lucide-react';
import { sidebarItems } from '../data';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: string;
  onSelect: (id: string) => void;
}

export default function Sidebar({ isOpen, onClose, activeItem, onSelect }: SidebarProps) {
  // Map string icon names to Lucide Icon components
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-5 h-5" />;
      case 'FolderHeart': return <FolderHeart className="w-5 h-5" />;
      case 'ClipboardList': return <ClipboardList className="w-5 h-5" />;
      case 'Construction': return <Construction className="w-5 h-5" />;
      case 'Map': return <Map className="w-5 h-5" />;
      case 'BarChart3': return <BarChart3 className="w-5 h-5" />;
      default: return <LayoutDashboard className="w-5 h-5" />;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 w-64 bg-surface-lowest border-r border-text-border/80 
          flex flex-col py-6 px-4 gap-4 z-50 transition-transform duration-300 ease-in-out
          lg:translate-x-0 
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Close Button (Mobile Only) */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-1 rounded-md text-text-muted hover:bg-surface-low transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand/Logo Header */}
        <div className="flex flex-col mb-8 mt-2 lg:mt-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-lg">
              F
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-brand-primary">
              FieldOps
            </h1>
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-text-outline mt-1 pl-10">
            Precision Intelligence
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 flex-1">
          {sidebarItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left w-full
                  ${isActive 
                    ? 'bg-surface-mid text-brand-primary translate-x-1 shadow-sm' 
                    : 'text-text-muted hover:bg-surface-low hover:text-text-main'
                  }
                `}
              >
                <span className={isActive ? 'text-brand-primary' : 'text-text-outline'}>
                  {getIcon(item.icon)}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Support / Action Links */}
        <div className="flex flex-col gap-1 border-t border-text-border pt-4">
          <button 
            onClick={() => {
              alert("FieldOps Support system loaded.");
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:bg-surface-low hover:text-text-main transition-all text-left w-full"
          >
            <HelpCircle className="w-5 h-5 text-text-outline" />
            <span>Support</span>
          </button>
          
          <button 
            onClick={() => {
              alert("Signing out... Redirecting to login portal.");
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:bg-surface-low hover:text-brand-error transition-all text-left w-full"
          >
            <LogOut className="w-5 h-5 text-text-outline" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
