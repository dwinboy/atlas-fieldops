import React, { useState } from 'react';
import { Menu, Bell, Settings, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  activeTitle: string;
}

export default function Header({ onMenuToggle, activeTitle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, type: 'alert', text: 'Officer Chen reported sync error in Zone B', time: '12m ago', active: true },
    { id: 2, type: 'success', text: 'Daily Target completed by Team Gamma', time: '45m ago', active: false },
    { id: 3, type: 'info', text: 'New assignment created: Village A sector scan', time: '1h ago', active: false },
  ];

  return (
    <header className="flex justify-between items-center px-6 lg:px-8 w-full h-16 sticky top-0 z-40 bg-surface-bg border-b border-text-border/80 backdrop-blur-md bg-opacity-95">
      {/* Left Area: Hamburger and Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-lg text-text-muted hover:bg-surface-low lg:hidden transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-brand-primary" />
        </button>
        <span className="text-lg font-bold text-brand-primary tracking-tight">
          {activeTitle}
        </span>
      </div>

      {/* Right Area: Actions and Profile */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-text-outline hover:bg-surface-high hover:text-text-main rounded-full cursor-pointer transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-error rounded-full border-2 border-surface-bg animate-pulse"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-surface-lowest border border-text-border rounded-xl shadow-shard-lg z-50 py-2">
                <div className="px-4 py-2 border-b border-text-border flex justify-between items-center">
                  <span className="font-bold text-sm">Notifications</span>
                  <span className="text-xs text-brand-primary font-semibold hover:underline cursor-pointer" onClick={() => alert("Marked all as read")}>
                    Mark all as read
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-text-border/60">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`px-4 py-3 hover:bg-surface-low/50 transition-colors flex gap-3 ${notif.active ? 'bg-surface-low/30' : ''}`}
                    >
                      <div className="mt-0.5">
                        {notif.type === 'alert' ? (
                          <ShieldAlert className="w-4 h-4 text-brand-error" />
                        ) : notif.type === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-brand-primary" />
                        ) : (
                          <Clock className="w-4 h-4 text-brand-secondary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-text-main font-medium">{notif.text}</p>
                        <span className="text-[10px] text-text-outline block mt-1">{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => alert("Preferences & System Settings loaded.")}
          className="p-2 text-text-outline hover:bg-surface-high hover:text-text-main rounded-full cursor-pointer transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Divider */}
        <span className="h-6 w-px bg-text-border/80 mx-1"></span>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-text-border/80 shadow-xs flex-shrink-0">
            <img 
              alt="User Profile Avatar" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2fRNYAVRVc7LhOFaKY-UD6mlyXW4689s9_htvkyF1Lcv57799TA7JnPhedqwzL--opNJ6BzQjtD4oj1hnSopAAsI8hmcxGStSjVZ1qFRKGi2kP3QkBAn_jQKxnr8Dh7xYwPA_yGRjRQHwQZvwf8N1raz06MXWeC7Qr-yNEhK3r7FPVRNxPNYX_EnK_ZO8PPHpFBz8ax877Jj2hVs9bX8tnNsnk7oRPx0PgzJ1gyS86gemcm8VQU53pdnioXMhN-07kRKfEiCzmA"
            />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-text-main leading-tight">Edwin Ndifor</span>
            <span className="text-[10px] text-text-outline leading-tight">Operations Lead</span>
          </div>
        </div>
      </div>
    </header>
  );
}
