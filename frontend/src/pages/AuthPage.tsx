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
    <div style={pageContainerStyle}>
      <div style={cardStyle}>
        {/* Cabeçalho do Card */}
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#2c3e50' }}>LocaTools</h1>
          <p style={{ margin: '5px 0 0', color: '#888', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta para começar'}
          </p>
        </div>

        {/* Abas de Navegação (Login / Registrar) */}
        <div style={tabsContainerStyle}>
          <Link 
            to="/auth?mode=login" 
            style={mode === 'login' ? activeTabStyle : inactiveTabStyle}
          >
            Entrar
          </Link>
          <Link 
            to="/auth?mode=register" 
            style={mode === 'register' ? activeTabStyle : inactiveTabStyle}
          >
            Criar Conta
          </Link>
        </div>
        
        {/* Área do Formulário */}
        <div style={formContainerStyle}>
          {mode === 'login' ? (
            <Login />
          ) : (
            <Register />
          )}
        </div>
      </div>

      {/* Rodapé simples */}
      <div style={{ marginTop: '1rem', color: '#999', fontSize: '0.8rem' }}>
        © 2025 LocaTools System
      </div>
    </div>
  );
};

const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f4f6f8',
  padding: '1rem'
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
  width: '100%',
  maxWidth: '420px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const headerStyle: React.CSSProperties = {
  padding: '2rem 2rem 1rem',
  textAlign: 'center',
  backgroundColor: '#fff'
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #eee',
  marginBottom: '1.5rem'
};

const baseTabStyle: React.CSSProperties = {
  flex: 1,
  textAlign: 'center',
  padding: '1rem',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: '500',
  transition: 'all 0.3s ease',
  cursor: 'pointer'
};

const activeTabStyle: React.CSSProperties = {
  ...baseTabStyle,
  color: '#007bff',
  borderBottom: '2px solid #007bff',
  backgroundColor: '#fbfbfb'
};

const inactiveTabStyle: React.CSSProperties = {
  ...baseTabStyle,
  color: '#888',
  borderBottom: '2px solid transparent',
  backgroundColor: '#fff'
};

const formContainerStyle: React.CSSProperties = {
  padding: '0 2rem 2rem',
};

export default AuthPage;