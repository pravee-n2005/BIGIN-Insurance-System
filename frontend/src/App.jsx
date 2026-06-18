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
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Statements from './pages/Statements';
import StatementNew from './pages/StatementNew';
import StatementDetail from './pages/StatementDetail';
import MasterData from './pages/MasterData';
import Incentives from './pages/Incentives';
import DailyIncentives from './pages/DailyIncentives';
import DataHealthDashboard from './pages/DataHealthDashboard';
import PolicyImport from './pages/PolicyImport';
import Renewals from './pages/Renewals';
import POSPMembers from './pages/POSPMembers';
import POSPIncentives from './pages/POSPIncentives';
import POSPReports from './pages/POSPReports';

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

              {/* Invoices — list is ownerOrAdmin, generate/save are admin-gated inside the page */}
              <Route path="/invoices"     element={<Invoices />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />

              {/* GST Module (statements) — list + detail readable by both, write actions gated inside */}
              <Route path="/statements"     element={<Statements />} />
              <Route path="/statements/:id" element={<StatementDetail />} />

              {/* Incentives — read for both roles, create/edit/delete gated inside the page */}
              <Route path="/incentives" element={<Incentives />} />

              {/* Daily Incentive Tracking — read for both roles, create/edit/delete/settings gated inside the page */}
              <Route path="/daily-incentives" element={<DailyIncentives />} />

              {/* Renewals — read-only operational worklist for both roles */}
              <Route path="/renewals" element={<Renewals />} />

              {/* POSP Module — all accessible by both roles, write actions gated inside */}
              <Route path="/posp/members"    element={<POSPMembers />} />
              <Route path="/posp/incentives" element={<POSPIncentives />} />
              <Route path="/posp/reports"    element={<POSPReports />} />

              {/* Admin-only write routes */}
              <Route element={<AdminRoute />}>
                <Route path="/policies/import"     element={<PolicyImport />} />
                <Route path="/policies/new"        element={<AddPolicy />} />
                <Route path="/policies/:id/edit"   element={<EditPolicy />} />
                <Route path="/invoice-profiles"    element={<InvoiceProfiles />} />
                <Route path="/master-data"         element={<MasterData />} />
                <Route path="/statements/new"      element={<StatementNew />} />
                <Route path="/data-health"         element={<DataHealthDashboard />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
