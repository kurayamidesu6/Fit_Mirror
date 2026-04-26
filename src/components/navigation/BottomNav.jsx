import { Link, useLocation } from 'react-router-dom';
import { Flame, Plus, Swords, ShoppingBag, Crown, Trophy, LogOut, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

const NAV_ITEMS = [
  { path: '/create', icon: Plus, label: 'Create' },
  { path: '/', icon: Flame, label: 'Feed' },
  { path: '/challenge', icon: Swords, label: 'Challenge' },
  { path: '/store', icon: ShoppingBag, label: 'Store' },
  { path: '/pro', icon: Crown, label: 'Pro' },
];

export default function SideNav({ collapsed, onCollapse }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email || 'Guest';

  return (
    <aside
      className={cn(
        'min-h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 overflow-hidden',
        collapsed ? 'w-0 border-r-0' : 'w-60'
      )}
    >
      {/* Logo + collapse button */}
      <div className="px-5 py-6 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Flame className="w-6 h-6 text-primary" />
          </div>
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
