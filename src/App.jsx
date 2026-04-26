import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SettingsProvider } from '@/lib/SettingsContext';
import AppLayout from '@/components/navigation/AppLayout';
import Feed from '@/pages/Feed';
import WorkoutDetail from '@/pages/WorkoutDetail';
import TryWorkout from '@/pages/TryWorkout';
import AttemptResult from '@/pages/AttemptResult';
import Profile from '@/pages/Profile';
import CreateWorkout from '@/pages/CreateWorkout';
import Pro from '@/pages/Pro';
import Challenge from '@/pages/Challenge';
import Store from '@/pages/Store';
import Achievements from '@/pages/Achievements';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Feed />} />
        <Route path="/workout/:id" element={<WorkoutDetail />} />
        <Route path="/try/:id" element={isAuthenticated ? <TryWorkout /> : <Navigate to="/login" replace />} />
        <Route path="/result/:id" element={isAuthenticated ? <AttemptResult /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
        <Route path="/create" element={isAuthenticated ? <CreateWorkout /> : <Navigate to="/login" replace />} />
        <Route path="/pro" element={<Pro />} />
        <Route path="/challenge" element={isAuthenticated ? <Challenge /> : <Navigate to="/login" replace />} />
        <Route path="/store" element={<Store />} />
        <Route path="/achievements" element={isAuthenticated ? <Achievements /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
