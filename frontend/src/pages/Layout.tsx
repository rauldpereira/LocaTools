import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Layout: React.FC = () => {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '60px' }}>
        <Outlet />
      </div>
    </>
  );
};

export default Layout;