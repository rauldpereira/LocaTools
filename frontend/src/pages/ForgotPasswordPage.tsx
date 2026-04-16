import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setIsError(false);
    setLoading(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/forgot-password`, { email });
      setIsError(false);
      setMsg("✅ Se o e-mail estiver cadastrado, enviaremos um link de recuperação!");
    } catch (err) {
      setIsError(true);
      setMsg("❌ Ocorreu um erro ao enviar. Verifique o e-mail digitado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>LocaTools</h1>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Recuperação de Acesso</p>
        </div>

        <div className="auth-form-container">
          <form onSubmit={handleSend}>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px', textAlign: 'center' }}>
              Informe seu e-mail abaixo. Enviaremos as instruções para você criar uma nova senha.
            </p>

            <div className="form-group">
              <label className="form-label">E-mail Cadastrado</label>
              <input 
                type="email" 
                className="form-input"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="seu@email.com"
              />
            </div>

            <button type="submit" className="btn-primary-auth" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Instruções"}
            </button>

            {msg && (
              <div className={`auth-message-box ${isError ? 'error' : ''}`} style={{ backgroundColor: isError ? '#fef2f2' : '#f0fdf4', color: isError ? '#b91c1c' : '#166534', border: `1px solid ${isError ? '#fee2e2' : '#dcfce7'}` }}>
                {msg}
              </div>
            )}
          </form>

          <div className="auth-footer">
            <p>Lembrou a senha? <Link to="/auth?mode=login">Voltar para o Login</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;