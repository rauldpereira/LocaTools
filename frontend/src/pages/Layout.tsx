import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar'; 
import Footer from '../components/Footer';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';

const Layout: React.FC = () => {
  return (
    <>
      <Navbar />
      
      <main style={{ minHeight: '80vh' }}>
        <Outlet />
      </main>

      <Footer />
      <ForcePasswordChangeModal />
    </>
  );
};

export default Layout;