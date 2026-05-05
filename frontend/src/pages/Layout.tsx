import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar'; 
import Footer from '../components/Footer';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';

const Layout: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      <Navbar />
      
      <main style={{ minHeight: '80vh' }}>
        <Outlet />
      </main>

      {!isAdminRoute && <Footer />}
      <ForcePasswordChangeModal />
    </>
  );
};

export default Layout;