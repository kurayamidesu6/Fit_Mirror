import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNav from './BottomNav';
import { PanelLeftOpen } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { cn } from '@/lib/utils';

function buildMeshStyle(colors) {
  return {
    background: `
      radial-gradient(ellipse at 15% 25%, ${colors[0]}55 0%, transparent 55%),
      radial-gradient(ellipse at 85% 75%, ${colors[1]}55 0%, transparent 55%),
      radial-gradient(ellipse at 70% 10%, ${colors[2]}55 0%, transparent 55%)
    `,
  };
}

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { bgColors, bgEnabled } = useSettings();

  const hiddenPaths = ['/try/', '/result/'];
  const sidebarHidden = hiddenPaths.some(p => location.pathname.includes(p));

  return (
    <div className={cn('min-h-screen text-foreground flex', !bgEnabled && 'bg-background')}>
      {/* Fixed gradient layer — sits behind all content */}
      {bgEnabled && (
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
          style={buildMeshStyle(bgColors)}
        />
      )}

      {!sidebarHidden && (
        <SideNav collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      )}

      {/* Floating re-open button when collapsed */}
      {!sidebarHidden && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-card/80 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-150"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      <main
        className={`flex-1 min-h-screen overflow-y-auto transition-all duration-300 ${
          sidebarHidden || collapsed ? 'ml-0' : 'ml-60'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
