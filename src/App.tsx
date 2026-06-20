import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">Lade...</div>;
  if (!user) return <Navigate to="/welcome" replace />;

  // Enforce onboarding unless already on the profile page
  if (profile && profile.onboarding_complete === false && window.location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

// Admin Protected Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">Lade...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
        <BrowserRouter>
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
              <Route path="matching" element={<Matching />} />
              <Route path="settings" element={<Settings />} />
              <Route path="requests" element={<Requests />} />
              <Route path="chat/:requestId" element={<Chat />} />
              <Route path="favorites" element={<Favorites />} />
            </Route>

            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/eltern-leitfaden" element={<ParentGuide />} />
            <Route path="/nutzungsbedingungen" element={<Nutzungsbedingungen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <CookieBanner />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
