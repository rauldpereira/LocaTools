import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar'; 
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';

const Layout: React.FC = () => {
  return (
    <>
      <Navbar />
      
      <main>
        <Outlet />
      </main>

      <ForcePasswordChangeModal />
    </>
  );
};

export default Layout;