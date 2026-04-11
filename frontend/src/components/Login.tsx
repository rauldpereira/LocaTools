import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
    setMensagem(''); // Limpa mensagens anteriores
    setDeuErro(false); // Reseta o estado de erro

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
        // Pega a string limpa que vem do backend: "Credenciais inválidas."
        setMensagem(error.response.data.error || 'Erro no servidor'); 
      } else {
        setMensagem('Erro desconhecido ao tentar fazer login.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{color: "#000"}}>Login de Usuário</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <button type="submit">Entrar</button>
      </form>
      
      {mensagem && (
        <p style={{ marginTop: '1rem', color: deuErro ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
          {mensagem}
        </p>
      )}
    </div>
  );
};

export default Login;