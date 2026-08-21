import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import Login from './pages/Login';
import SVDashboard from './pages/admin/Dashboard';
import AdminLayout from './pages/admin/AdminLayout';
import ParentDashboard from './pages/ParentDashboard';
import Matching from './pages/Matching';
import CreateAd from './pages/CreateAd';
import AdDetails from './pages/AdDetails';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Requests from './pages/Requests';
import Favorites from './pages/Favorites';
import Landing from './pages/Landing';
import Chat from './pages/Chat';
import Social from './pages/Social';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from 'react-hot-toast';
import { CookieBanner } from './components/CookieBanner';
import PublicProfile from './pages/PublicProfile';
import Impressum from './pages/Impressum';
import Datenschutz from './pages/Datenschutz';
import Cookies from './pages/Cookies';
import UpdatePassword from './pages/UpdatePassword';
import ParentGuide from './pages/ParentGuide';
import Nutzungsbedingungen from './pages/Nutzungsbedingungen';

// Branded loading spinner
function AppLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-950 gap-4">
      <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center font-black text-black text-xl shadow-lg animate-pulse">N</div>
      <div className="w-6 h-6 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

import { useAnalyticsTracker } from './lib/analytics';

function AnalyticsTracker() {
  useAnalyticsTracker();
  return null;
}

import { NewsPopupModal } from './components/NewsPopupModal';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/welcome" replace />;

  // Only redirect to profile if onboarding_complete is explicitly false AND has no name at all
  // Never redirect if already on /profile to avoid redirect loops
  const isProfileIncomplete =
    profile !== null &&
    profile.onboarding_complete === false &&
    !profile.first_name &&
    !profile.display_name;

  if (isProfileIncomplete && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

// Admin Protected Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) return <AppLoader />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
        <HashRouter>
          <AnalyticsTracker />
          <Routes>
            <Route path="/welcome" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Feed />} />
              <Route path="create-ad" element={<CreateAd />} />
              <Route path="ad/:id" element={<AdDetails />} />
              <Route path="profile" element={<Profile />} />
              <Route path="/profile/:id" element={<PublicProfile />} />
              <Route path="sv-panel" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<SVDashboard />} />
              </Route>
              <Route path="parent-dashboard" element={<ParentDashboard />} />
              <Route path="social" element={<Social />} />
              <Route path="matching" element={<Navigate to="/social?tab=matches" replace />} />
              <Route path="settings" element={<Settings />} />
              <Route path="requests" element={<Navigate to="/social?tab=requests" replace />} />
              <Route path="chat/:requestId" element={<Chat />} />
              <Route path="favorites" element={<Navigate to="/social?tab=watchlist" replace />} />
            </Route>

            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/eltern-leitfaden" element={<ParentGuide />} />
            <Route path="/nutzungsbedingungen" element={<Nutzungsbedingungen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CookieBanner />
          <NewsPopupModal />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
