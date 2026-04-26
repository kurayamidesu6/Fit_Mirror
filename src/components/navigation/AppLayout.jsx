import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SideNav from './BottomNav';
import { PanelLeftOpen } from 'lucide-react';

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const hiddenPaths = ['/try/', '/result/'];
  const sidebarHidden = hiddenPaths.some(p => location.pathname.includes(p));

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {!sidebarHidden && (
        <SideNav collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      )}

      {/* Floating re-open button when collapsed */}
      {!sidebarHidden && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-150"
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
