import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/shared/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CashFlowDashboard } from './pages/CashFlowDashboard';
import { FloatingCashView } from './pages/FloatingCashView';
import { InventoryDashboard } from './pages/InventoryDashboardNew';
import { Employees } from './pages/Employees';
import { Stations } from './pages/StationsNew';
import { OrganizationStructure } from './pages/OrganizationStructure';
import { OfficePurchaseRequests } from './pages/OfficePurchaseRequests';
import { AdminFuelBuyingRates } from './pages/AdminFuelBuyingRates';
import { AdminTransporters } from './pages/AdminTransporters';
import { ProcurementDashboard } from './pages/ProcurementDashboard';
import { useAuth } from './hooks/useAuth';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // FIXED: Added basename here so the app knows it lives in a folder
  return (
    <Router basename="/darbcashflow">
      <Routes>
        <Route path="/login" element={<Login />} />
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
            <ProtectedRoute allowedRoles={['Admin', 'AM', 'SM', 'ViewOnly']}>
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
        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Layout>
                <Employees />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stations"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Layout>
                <Stations />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Layout>
                <OrganizationStructure />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-requests"
          element={
            <ProtectedRoute allowedRoles={['OU', 'Admin', 'Accountant', 'ViewOnly']}>
              <Layout>
                <OfficePurchaseRequests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/procurement"
          element={
            <ProtectedRoute allowedRoles={['Procurement', 'Admin']}>
              <Layout>
                <ProcurementDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/fuel-buying-rates"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Layout>
                <AdminFuelBuyingRates />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transporters"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <Layout>
                <AdminTransporters />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* This redirect will now correctly go to /darbcashflow/login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;


