import './App.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
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
import EditEquipmentPage from './pages/EditEquipmentPage';

const stripePromise = loadStripe('pk_test_51RxzLsHUnTeu3by4toldZZMEswVFiFnrXc0eSI9PyNzEGnICbSvasFqoC0cmMgqkD3Ie6tQIEhKlhDvitfTbcwTT00qAldkZVx');

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Elements stripe={stripePromise}>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="auth" element={<AuthPage />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="equipment/:id" element={<EquipmentDetailsPage />} />
                <Route path="cart" element={<CartPage />} />
                <Route path="payment/:orderId" element={<PaymentPage />} />
                <Route path="my-reservations" element={<MyReservationsPage />} />
                <Route path="payment/success/:orderId" element={<PaymentSuccessPage />} />
                <Route path="my-reservations/:orderId" element={<ReservationDetailsPage />} />
                <Route path="admin/vistoria/:orderId" element={<VistoriaPage />} />
                <Route path="admin/finalize-payment/:orderId" element={<FinalizePaymentPage />} />
                <Route path="admin/equipment/:id/edit" element={<EditEquipmentPage />} />
              </Route>
            </Routes>
          </Router>
        </Elements>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;