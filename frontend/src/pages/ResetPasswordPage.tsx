import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Auth.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); 
  const navigate = useNavigate();
  
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "#e2e8f0" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!novaSenha) {
      setPasswordStrength({ score: 0, label: "", color: "#e2e8f0" });
      return;
    }
    let score = 0;
    if (novaSenha.length >= 8) score++;
    if (/[A-Z]/.test(novaSenha)) score++;
    if (/[0-9]/.test(novaSenha)) score++;
    if (/[^A-Za-z0-9]/.test(novaSenha)) score++;

    const labels = ["Fraca", "Razoável", "Boa", "Forte"];
    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
    
    setPasswordStrength({ 
      score: (score / 4) * 100, 
      label: labels[score - 1] || labels[0],
      color: colors[score - 1] || colors[0]
    });
  }, [novaSenha]);

  useEffect(() => {
    if (confirmSenha && novaSenha !== confirmSenha) {
        setErrors({ match: "Senhas não coincidem, por favor" });
    } else {
        setErrors({});
    }
  }, [confirmSenha, novaSenha]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmSenha) {
        setMsg("❌ As senhas não coincidem, por favor verifique.");
        setIsError(true);
        return;
    }

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reset-password`, { token, novaSenha });
      setMsg("✅ Senha alterada com sucesso!");
      setIsError(false);
      setTimeout(() => navigate('/auth?mode=login'), 2000);
    } catch (err: any) {
      setIsError(true);
      setMsg(err.response?.data?.error || "❌ Link inválido ou expirado!");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Erro</h1>
                    <p style={{ marginTop: '10px' }}>O link de recuperação é inválido ou expirou.</p>
                </div>
                <div className="auth-form-container" style={{ textAlign: 'center' }}>
                    <Link to="/auth?mode=login" className="btn-primary-auth" style={{ textDecoration: 'none', display: 'block' }}>Voltar ao Início</Link>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Nova Senha</h1>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Crie uma senha segura para sua conta</p>
        </div>

        <div className="auth-form-container">
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">Nova Senha</label>
              <input 
                type="password" 
                className="form-input"
                value={novaSenha} 
                onChange={e => setNovaSenha(e.target.value)} 
                required 
                placeholder="Mínimo 8 caracteres"
              />
              <div className="password-meter">
                <div className="meter-fill" style={{ width: `${passwordStrength.score}%`, backgroundColor: passwordStrength.color }}></div>
              </div>
              {novaSenha && <span className="meter-text" style={{ color: passwordStrength.color }}>Senha {passwordStrength.label}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Senha</label>
              <input 
                type="password" 
                className={`form-input ${errors.match ? 'error' : ''}`}
                value={confirmSenha} 
                onChange={e => setConfirmSenha(e.target.value)} 
                required 
                placeholder="Repita a nova senha"
              />
              {errors.match && <span className="error-msg">{errors.match}</span>}
            </div>

            <button type="submit" className="btn-primary-auth" disabled={loading || novaSenha !== confirmSenha}>
              {loading ? "Salvando..." : "Redefinir Senha"}
            </button>

            {msg && (
              <div className={`auth-message-box ${isError ? 'error' : ''}`} style={{ backgroundColor: isError ? '#fef2f2' : '#f0fdf4', color: isError ? '#b91c1c' : '#166534', border: `1px solid ${isError ? '#fee2e2' : '#dcfce7'}` }}>
                {msg}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;