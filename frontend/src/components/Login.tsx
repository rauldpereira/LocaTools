import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [mensagem, setMensagem] = useState<string>('');
  const [deuErro, setDeuErro] = useState<boolean>(false); 

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem('');
    setDeuErro(false);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, {
        email,
        senha,
      });
      const { token } = response.data;
      await login(token);
      navigate('/');
    } catch (error) {
      setDeuErro(true);
      if (axios.isAxiosError(error) && error.response) {
        setMensagem(error.response.data.error || 'Credenciais inválidas.'); 
      } else {
        setMensagem('Falha na conexão com o servidor.');
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input
            type="email"
            className="form-input"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Senha</label>
          <input
            type="password"
            className="form-input"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary-auth">
          Entrar no Sistema
        </button>
        
        {mensagem && (
          <div className={`auth-message-box ${deuErro ? 'error' : ''}`}>
            {mensagem}
          </div>
        )}
      </form>

      <div className="auth-footer">
        <p>Esqueceu sua senha? <Link to="/forgot-password">Recuperar acesso</Link></p>
        <p style={{ marginTop: '10px' }}>Não tem uma conta? <Link to="/auth?mode=register">Cadastre-se</Link></p>
      </div>
    </>
  );
};

export default Login;