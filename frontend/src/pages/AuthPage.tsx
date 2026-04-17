import React, { useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Login from '../components/Login';
import Register from '../components/Register';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const isExpired = searchParams.get('expired') === 'true';
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="auth-page">
      
      {isExpired && (
        <div className="auth-alert">
          <div className="auth-alert-icon">⚠️</div>
          <div className="auth-alert-content">
            <strong>Sessão Expirada</strong>
            <p>Por segurança, você foi desconectado. Por favor, faça login novamente para continuar.</p>
          </div>
        </div>
      )}

      <div className={`auth-card ${mode}`}>
        <div className="auth-header">
          <h1>LocaTools</h1>
        </div>

        <div className="auth-tabs">
          <Link 
            to="/auth?mode=login" 
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          >
            Acessar Conta
          </Link>
          <Link 
            to="/auth?mode=register" 
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
          >
            Criar Cadastro
          </Link>
        </div>
        
        <div className="auth-form-container">
          {mode === 'login' ? <Login /> : <Register />}
        </div>
      </div>

      <div className="copyright" style={{ marginTop: '20px', color: '#94a3b8', fontSize: '0.75rem' }}>
        © 2026 LocaTools
      </div>
    </div>
  );
};

export default AuthPage;