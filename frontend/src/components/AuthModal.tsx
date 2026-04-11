import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, { email, senha });
      
      login(data.token); 
      
      onClose();

    } catch (err: any) {
      setError(err.response?.data?.error || 'Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#fff', padding: '30px', borderRadius: '12px',
        width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}
        >
          &times;
        </button>

        <h2 style={{ marginTop: 0, color: '#333', textAlign: 'center' }}>Falta pouco! 🚀</h2>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '20px', fontSize: '0.95rem' }}>
          Identifique-se para finalizar sua reserva.
        </p>

        {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" placeholder="Seu E-mail" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }}
          />
          <input 
            type="password" placeholder="Sua Senha" required
            value={senha} onChange={(e) => setSenha(e.target.value)}
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', width: '100%' }}
          />
          <button 
            type="submit" disabled={loading}
            style={{ 
              padding: '12px', backgroundColor: '#007bff', color: 'white', fontWeight: 'bold', 
              border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Entrar e Continuar'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
          Não tem uma conta? <br/>
          <button 
            onClick={() => navigate('/auth?mode=register')}
            style={{ background: 'none', border: 'none', color: '#007bff', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', fontSize: '1rem' }}
          >
            Cadastre-se rapidinho
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;