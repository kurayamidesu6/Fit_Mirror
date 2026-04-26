import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <TopBar />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}