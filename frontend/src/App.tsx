import './App.css';
import AuthProvider from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SearchProvider } from './context/SearchContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Importações das páginas
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Profile from './components/Profile';
import AdminDashboard from './pages/AdminDashboard';
import EquipmentDetailsPage from './pages/EquipmentDetailsPage';
import CartPage from './pages/CartPage';
import Layout from './pages/Layout';
import PaymentPage from './pages/PaymentPage';
import MyReservationsPage from './pages/MyReservationsPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ReservationDetailsPage from './pages/ReservationDetailsPage';
import VistoriaPage from './pages/VistoriaPage';
import FinalizePaymentPage from './pages/FinalizePaymentPage';
import AdminReportsPage from './pages/AdminReportsPage';
import GerenciamentoCalendario from './components/Admin/GerenciamentoCalendario';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <SearchProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="auth" element={<AuthPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="equipment/:id" element={<EquipmentDetailsPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="payment/:orderId" element={<PaymentPage />} />
                <Route path="/payment-multi" element={<PaymentPage />} />
                <Route path="my-reservations" element={<MyReservationsPage />} />
                <Route path="payment/success/:orderId" element={<PaymentSuccessPage />} />
                <Route path="my-reservations/:orderId" element={<ReservationDetailsPage />} />
                <Route path="admin/vistoria/:orderId" element={<VistoriaPage />} />
                <Route path="admin/finalize-payment/:orderId" element={<FinalizePaymentPage />} />
                <Route path="admin/reports" element={<AdminReportsPage />} />
                <Route path="admin/calendario" element={<GerenciamentoCalendario />} />
              </Route>
            </Routes>
          </Router>
        </SearchProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;