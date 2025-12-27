import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/shared/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CashFlowDashboard } from './pages/CashFlowDashboard';
import { FloatingCashView } from './pages/FloatingCashView';
import { InventoryDashboard } from './pages/InventoryDashboard';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          /* Redirect to dashboard as auth is disabled */
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Layout>
                <Register />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cash-flow"
          element={
            <ProtectedRoute>
              <Layout>
                <CashFlowDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/floating-cash"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Layout>
                <FloatingCashView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Layout>
                <InventoryDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

