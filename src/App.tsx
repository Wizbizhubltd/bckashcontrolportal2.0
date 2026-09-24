import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { VerifyOtp } from './pages/VerifyOtp';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { OfficesListPage } from './pages/offices/OfficesListPage';
import { OfficeFormPage } from './pages/offices/OfficeFormPage';
import { StaffListPage } from './pages/staff/StaffListPage';
import { StaffFormPage } from './pages/staff/StaffFormPage';
import { StaffDetailPage } from './pages/staff/StaffDetailPage';
import { SuperAdminsPage } from './pages/super-admins/SuperAdminsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ClientsListPage } from './pages/clients/ClientsListPage';
import { LoansListPage } from './pages/loans/LoansListPage';
import { LateLoansListPage } from './pages/loans/LateLoansListPage';
import { LoanTransactionsListPage } from './pages/loan-transactions/LoanTransactionsListPage';
import { LoanApplicationsListPage } from './pages/loan-applications/LoanApplicationsListPage';

export function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            background: '#1F2937',
            color: '#fff',
            fontSize: '13px',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />

              <Route path="offices">
                <Route index element={<OfficesListPage />} />
                <Route path="new" element={<OfficeFormPage />} />
                <Route path=":id/edit" element={<OfficeFormPage />} />
              </Route>

              <Route path="staff">
                <Route index element={<StaffListPage />} />
                <Route path="new" element={<StaffFormPage />} />
                <Route path=":id" element={<StaffDetailPage />} />
              </Route>

              <Route path="super-admins" element={<SuperAdminsPage />} />
              <Route path="settings" element={<SettingsPage />} />

              <Route path="clients" element={<ClientsListPage />} />
              <Route path="loans">
                <Route index element={<LoansListPage />} />
                <Route path="late" element={<LateLoansListPage />} />
              </Route>
              <Route path="loan-transactions" element={<LoanTransactionsListPage />} />
              <Route path="loan-applications" element={<LoanApplicationsListPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
