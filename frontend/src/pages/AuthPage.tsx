import React, { useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Login from '../components/Login';
import Register from '../components/Register';
import { useAuth } from '../context/AuthContext';

const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  return (
    <div>
      <div style={{ padding: '2rem', maxWidth: '400px', margin: 'auto' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link to="/auth?mode=login">
            <button style={{
              backgroundColor: mode === 'login' ? '#007bff' : 'lightgray',
              color: mode === 'login' ? 'white' : 'black',
              border: 'none',
              padding: '0.5rem 1rem',
              cursor: 'pointer'
            }}>
              Login
            </button>
          </Link>
          <Link to="/auth?mode=register">
            <button style={{
              backgroundColor: mode === 'register' ? '#007bff' : 'lightgray',
              color: mode === 'register' ? 'white' : 'black',
              border: 'none',
              padding: '0.5rem 1rem',
              cursor: 'pointer'
            }}>
              Registrar
            </button>
          </Link>
        </div>
        
        {mode === 'login' ? (
          <Login />
        ) : (
          <Register />
        )}
      </div>
    </div>
  );
};

export default AuthPage;