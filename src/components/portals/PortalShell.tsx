import React, { useState } from 'react';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { EprRateTickerBar, ErrorAlertBanner, LogoMark } from '../ui/DesignSystem';
import { useMarketplace } from '../../context/MarketplaceContext';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface PortalShellProps {
  portalTitle: string;
  userTitle: string;
  userSubtitle: string;
  navItems: SidebarNavItem[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNotifications: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const PortalShell: React.FC<PortalShellProps> = ({
  portalTitle,
  userTitle,
  userSubtitle,
  navItems,
  activeTab,
  onSelectTab,
  onOpenNotifications,
  headerAction,
  children,
}) => {
  const { role, notifications, publishedRates, logout, navigatePublic, connectionError, permissionError } = useMarketplace();
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.targetRole === role && !n.read).length;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#10233F] text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <LogoMark dark onClick={() => navigatePublic('home')} />
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded text-[#CBD5E1] hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{portalTitle}</div>
        <div className="text-xs font-semibold text-white truncate mt-0.5">{userTitle}</div>
        <div className="text-[11px] font-mono text-[#94A3B8] truncate">{userSubtitle}</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#16A36A] text-white shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2 shrink-0">
        <button
          type="button"
          onClick={() => navigatePublic('home')}
          className="w-full flex items-center justify-center px-3 py-2 rounded-md text-xs font-medium text-[#CBD5E1] bg-white/5 hover:bg-white/10 cursor-pointer"
        >
          Public Marketplace Home
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-[#FDA4AF] hover:bg-white/10 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F7FB]">
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">{SidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[270px] h-full">{SidebarContent}</div>
          <div className="flex-1 bg-[#0A172A]/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 z-30 bg-white">
          <EprRateTickerBar rates={publishedRates} />
          <header className="h-14 sm:h-16 border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-md border border-[#E2E8F0] text-[#0A172A]"
                aria-label="Open navigation"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-[#64748B] hidden sm:inline">{portalTitle}</span>
                <span className="text-[#CBD5E1] hidden sm:inline">/</span>
                <span className="font-display font-semibold text-[#0A172A] capitalize truncate">
                  {activeTab.replace(/-/g, ' ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {headerAction}
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#16A36A] text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </header>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6">
          {connectionError && (
            <ErrorAlertBanner title="Service Connection Notice" message={connectionError} />
          )}
          {permissionError && (
            <ErrorAlertBanner title="Account Sync Notice" message={permissionError} />
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
