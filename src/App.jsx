import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Feed />} />
        <Route path="/workout/:id" element={<WorkoutDetail />} />
        <Route path="/try/:id" element={<TryWorkout />} />
        <Route path="/result/:id" element={<AttemptResult />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create" element={<CreateWorkout />} />
        <Route path="/pro" element={<Pro />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/store" element={<Store />} />
        <Route path="/achievements" element={<Achievements />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App