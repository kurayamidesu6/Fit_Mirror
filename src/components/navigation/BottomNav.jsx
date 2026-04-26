import { Link, useLocation } from 'react-router-dom';
import { Flame, Plus, Swords, ShoppingBag, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/', icon: Flame, label: 'Feed' },
  { path: '/create', icon: Plus, label: 'Create' },
  { path: '/challenge', icon: Swords, label: 'Challenge' },
  { path: '/store', icon: ShoppingBag, label: 'Store' },
  { path: '/pro', icon: Crown, label: 'Pro' },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide nav on certain pages
  const hiddenPaths = ['/try/', '/result/'];
  const shouldHide = hiddenPaths.some(p => location.pathname.includes(p));
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path);

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all duration-200',
                isActive && 'bg-primary/10'
              )}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for mobile devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}