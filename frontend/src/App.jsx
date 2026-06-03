import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import PolicyDetail from './pages/PolicyDetail';
import AddPolicy from './pages/AddPolicy';
import EditPolicy from './pages/EditPolicy';
import Reports from './pages/Reports';
import InvoiceProfiles from './pages/InvoiceProfiles';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard"          element={<Dashboard />} />
              <Route path="/policies"           element={<Policies />} />
              <Route path="/policies/:id"       element={<PolicyDetail />} />
              <Route path="/reports"            element={<Reports />} />

              {/* Admin-only write routes */}
              <Route element={<AdminRoute />}>
                <Route path="/policies/new"        element={<AddPolicy />} />
                <Route path="/policies/:id/edit"   element={<EditPolicy />} />
                <Route path="/invoice-profiles"    element={<InvoiceProfiles />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
