import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SupabaseProvider } from './context/SupabaseContext';
import { cleanupRealtimeCache } from './hooks/useRealtimeSupabaseData';
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';
import ClientLayout from './layouts/ClientLayout';
import LoginPage from './pages/LoginPage';
import CustomerRegistration from './pages/CustomerRegistration';
import InvoiceViewer from './components/invoices/InvoiceViewer';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import InvoiceViewerPage from './pages/InvoiceViewerPage';
import Products from './pages/Products';
import HandoverInvoicePage from './pages/HandoverInvoicePage';
import QRPaymentPage from './pages/staff/QRPaymentPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminApprovals from './pages/admin/Approvals';
import AdminPayments from './pages/admin/Payments';
import AdminStaffPayouts from './pages/admin/StaffPayouts';
import AdminHandoverReturnCar from './pages/admin/HandoverReturnCar';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSoldCars from './pages/admin/SoldCars';
import AdminBookings from './pages/admin/Bookings';
import AdminSettings from './pages/admin/Settings';
import AdminCars from './pages/admin/Cars';
import AdminUsers from './pages/admin/Users';
import StaffDashboard from './pages/staff/Dashboard';
import StaffRegisterCustomer from './pages/staff/RegisterCustomer';
import StaffBookCar from './pages/staff/BookCar';
import StaffAgentBookCar from './pages/staff/AgentBookCar';
import StaffBookings from './pages/staff/Bookings';
import HandoverReturnCar from './pages/staff/HandoverReturnCar';
import StaffOverdueTracking from './pages/staff/OverdueTracking';
import StaffUploadPayment from './pages/staff/UploadPayment';
import StaffCustomerHistory from './pages/staff/CustomerHistory';
import ClientDashboard from './pages/client/Dashboard';
import ClientBookings from './pages/client/Bookings';
import ClientBookCar from './pages/client/BookCar';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
              <Route path="/invoice/:invoiceId" element={<InvoiceViewerPage />} />
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<CustomerRegistration />} />
      <Route path="/invoice/:invoiceId" element={<InvoiceViewer />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancelled" element={<PaymentCancelled />} />
      <Route path="/products" element={<Products />} />
      <Route path="/handover-invoice/:invoiceId" element={<HandoverInvoicePage />} />
      <Route path="/staff/qr-pay/:bookingId" element={<QRPaymentPage />} />
      <Route path="/" element={
        user ? (
          <Navigate to={
            user.role === 'admin' ? '/admin/dashboard' :
            user.role === 'staff' ? '/staff/dashboard' :
            '/client/dashboard'
          } replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="handover-return" element={<AdminHandoverReturnCar />} />
        <Route path="staff-payouts" element={<AdminStaffPayouts />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="sold-cars" element={<AdminSoldCars />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="settings/cars" element={<AdminCars />} />
        <Route path="settings/users" element={<AdminUsers />} />
      </Route>

      {/* Staff Routes */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['staff']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="register-customer" element={<StaffRegisterCustomer />} />
        <Route path="book-car" element={<StaffBookCar />} />
        <Route path="agent" element={<StaffAgentBookCar />} />
        <Route path="bookings" element={<StaffBookings />} />
        <Route path="handover-return" element={<HandoverReturnCar />} />
        <Route path="overdue-tracking" element={<StaffOverdueTracking />} />
        <Route path="upload-payment" element={<StaffUploadPayment />} />
        <Route path="customer-history" element={<StaffCustomerHistory />} />
      </Route>

      {/* Client Routes */}
      <Route path="/client" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <ClientLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/client/dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="book-car" element={<ClientBookCar />} />
        <Route path="bookings" element={<ClientBookings />} />
      </Route>

      {/* Legacy dashboard route for backward compatibility */}
      <Route path="/dashboard" element={
        user ? (
          <Navigate to={
            user.role === 'admin' ? '/admin/dashboard' :
            user.role === 'staff' ? '/staff/dashboard' :
            '/client/dashboard'
          } replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
};

function App() {
  // Cleanup realtime cache when app unmounts
  useEffect(() => {
    return () => {
      cleanupRealtimeCache();
    };
  }, []);

  return (
    <SupabaseProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <AppRoutes />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                },
                success: {
                  iconTheme: {
                    primary: '#00FF87',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#FF006E',
                    secondary: '#ffffff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App;