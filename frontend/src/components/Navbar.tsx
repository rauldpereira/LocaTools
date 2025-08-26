import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { isLoggedIn, logout, user } = useAuth();
  const location = useLocation(); 

  const showAuthLinks = location.pathname !== '/auth';

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#333', color: 'white' }}>
      <div>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>LocaTools</Link>
      </div>
      <div>
        {isLoggedIn ? (
          <>
            <span style={{ marginRight: '1rem' }}>Olá, {user?.nome}</span>
            <button onClick={logout}>Sair</button>
          </>
        ) : (
          showAuthLinks && (
            <>
              <Link to="/auth?mode=login" style={{ color: 'white', marginRight: '1rem' }}>Login</Link>
              <Link to="/auth?mode=register" style={{ color: 'white' }}>Registrar</Link>
            </>
          )
        )}
      </div>
    </nav>
  );
};

export default Navbar;