import './App.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Profile from './components/Profile';
import AdminDashboard from './pages/AdminDashboard';
import EquipmentDetailsPage from './pages/EquipmentDetailsPage';
import CartPage from './pages/CartPage';
import Layout from './pages/Layout';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="auth" element={<AuthPage />} />
              <Route path="profile" element={<Profile />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="equipment/:id" element={<EquipmentDetailsPage />} />
              <Route path="cart" element={<CartPage />} />
            </Route>
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;