import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage'; // Profile Branding (existing)
import DashboardHome from './pages/DashboardHome'; // 🔥 NEW MAIN DASHBOARD
import LinkedInPage from './pages/LinkedInPage';
import GitHubPage from './pages/GitHubPage';
import YouTubePage from './pages/YouTubePage';
import WebsitePage from './pages/WebsitePage';
import CredentialsPage from './pages/CredentialsPage';
import NetworkingPage from './pages/NetworkingPage';
import AIToolsPage from './pages/AIToolsPage';
import AIInterviewPage from './pages/AIInterviewPage';
import AdminPage from './pages/AdminPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminJobsPage from './pages/admin/AdminJobsPage';
import AdminInternshipsPage from './pages/admin/AdminInternshipsPage';
import AdminJobFormPage from './pages/admin/AdminJobFormPage';
import AdminInternshipFormPage from './pages/admin/AdminInternshipFormPage';
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage';

// Additionals
import ApplicationStatusPage from './pages/ApplicationStatusPage';
import CounselingPage from './pages/CounselingPage';
import ProfilePage from './pages/ProfilePage';
import ContactPage from './pages/ContactPage';
import DashboardOverview from './pages/DashboardOverview';

const getDefaultRoute = (user) => (user?.role === 'admin' ? '/admin' : (user?.role === 'user' ? '/dashboard-overview' : '/home'));

// 🔐 Protected route (logged-in users)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
};

// 🔐 Admin-only route
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return children;
};

// 🔄 Loader
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--bg-primary)'
  }}>
    <div style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: '3px solid #eadfd6',
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function AppRoutes() {
  const { user } = useAuth();
  const defaultRoute = getDefaultRoute(user);

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={user ? <Navigate to={defaultRoute} /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={defaultRoute} /> : <RegisterPage />} />

      {/* 🔥 MAIN DASHBOARD */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <DashboardHome />
          </ProtectedRoute>
        }
      />

      {/* Profile Branding (existing system) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Tools */}
      <Route path="/linkedin" element={<ProtectedRoute><LinkedInPage /></ProtectedRoute>} />
      <Route path="/github" element={<ProtectedRoute><GitHubPage /></ProtectedRoute>} />
      <Route path="/youtube" element={<ProtectedRoute><YouTubePage /></ProtectedRoute>} />
      <Route path="/website" element={<ProtectedRoute><WebsitePage /></ProtectedRoute>} />
      <Route path="/credentials" element={<ProtectedRoute><CredentialsPage /></ProtectedRoute>} />
      <Route path="/networking" element={<ProtectedRoute><NetworkingPage /></ProtectedRoute>} />
      <Route path="/ai-tools" element={<ProtectedRoute><AIToolsPage /></ProtectedRoute>} />
      <Route path="/ai-interview" element={<ProtectedRoute><AIInterviewPage /></ProtectedRoute>} />
      <Route path="/ai-interview/:id" element={<ProtectedRoute><AIInterviewPage /></ProtectedRoute>} />

      {/* Additionals */}
      <Route path="/application-status" element={<ProtectedRoute><ApplicationStatusPage /></ProtectedRoute>} />
      <Route path="/counseling" element={<ProtectedRoute><CounselingPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
      <Route path="/dashboard-overview" element={<ProtectedRoute><DashboardOverview /></ProtectedRoute>} />

      {/* 🔥 ADMIN */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <Navigate to="/admin" replace />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <AdminRoute>
            <AdminJobsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/jobs/create"
        element={
          <AdminRoute>
            <AdminJobFormPage mode="create" />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/jobs/:id/edit"
        element={
          <AdminRoute>
            <AdminJobFormPage mode="edit" />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/jobs/:id/applications"
        element={
          <AdminRoute>
            <AdminApplicationsPage type="jobs" />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/internships"
        element={
          <AdminRoute>
            <AdminInternshipsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/internships/create"
        element={
          <AdminRoute>
            <AdminInternshipFormPage mode="create" />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/internships/:id/edit"
        element={
          <AdminRoute>
            <AdminInternshipFormPage mode="edit" />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/internships/:id/applications"
        element={
          <AdminRoute>
            <AdminApplicationsPage type="internships" />
          </AdminRoute>
        }
      />

      {/* Default routes */}
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(255,255,255,0.96)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              borderRadius: '14px'
            },
            success: {
              iconTheme: {
                primary: 'var(--green)',
                secondary: 'var(--bg-card)'
              }
            },
            error: {
              iconTheme: {
                primary: 'var(--red)',
                secondary: 'var(--bg-card)'
              }
            }
          }}
        />
      </Router>
    </AuthProvider>
  );
}
