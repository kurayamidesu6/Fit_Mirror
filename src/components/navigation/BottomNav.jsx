import { Link, useLocation } from 'react-router-dom';
import { Flame, Plus, Swords, Crown, Trophy, LogOut, PanelLeftClose, Settings } from 'lucide-react';
const logo = '/logo.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useSettings } from '@/lib/SettingsContext';
import WalletButton from '@/components/wallet/WalletButton';

const NAV_ITEMS = [
  { path: '/create', icon: Plus, label: 'Create' },
  { path: '/', icon: Flame, label: 'Feed' },
  { path: '/challenge', icon: Swords, label: 'Challenge' },
  { path: '/pro', icon: Crown, label: 'Pro' },
];

export default function SideNav({ collapsed, onCollapse }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { bgEnabled } = useSettings();

  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email || 'Guest';

  return (
    <aside
      className={cn(
        'min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 overflow-hidden border-r',
        bgEnabled
          ? 'bg-background/60 backdrop-blur-xl border-border/40'
          : 'bg-card border-border',
        collapsed ? 'w-0 border-r-0' : 'w-60'
      )}
    >
      {/* Logo + collapse button */}
      <div className="px-5 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Fit Mirror" className="w-9 h-9 object-contain rounded-lg" />
          <span className="font-space font-bold text-xl tracking-tight whitespace-nowrap">Fit Mirror</span>
        </div>
        <button
          onClick={onCollapse}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150 flex-shrink-0"
          title="Hide sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        <div className="px-1 pb-1">
          <WalletButton fullWidth size="sm" /></div>
        <Link
          to="/achievements"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-150',
            location.pathname === '/achievements'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Trophy className="w-5 h-5 flex-shrink-0" />
          Achievements
        </Link>

        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-150',
            location.pathname === '/settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          Settings
        </Link>

        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-150',
            location.pathname === '/profile'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <span className="truncate">{displayName}</span>
        </Link>

        {user && (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
