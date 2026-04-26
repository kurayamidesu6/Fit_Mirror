import { Link, useLocation } from 'react-router-dom';
import { User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

// Pages that show the top-right profile/achievements icons
const PAGES_WITH_TOPBAR = ['/', '/pro', '/challenge', '/store', '/create'];

export default function TopBar() {
  const location = useLocation();
  const show = PAGES_WITH_TOPBAR.some(p =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  if (!show) return null;

  return (
    <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
      <Link to="/achievements">
        <div className={cn(
          'w-9 h-9 rounded-full bg-card/80 backdrop-blur-xl border border-border flex items-center justify-center',
          'hover:border-chart-3/50 transition-colors'
        )}>
          <Trophy className="w-4 h-4 text-chart-3" />
        </div>
      </Link>
      <Link to="/profile">
        <div className={cn(
          'w-9 h-9 rounded-full bg-card/80 backdrop-blur-xl border border-border flex items-center justify-center',
          'hover:border-primary/50 transition-colors'
        )}>
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      </Link>
    </div>
  );
}