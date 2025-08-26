// frontend/src/components/Login.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [mensagem, setMensagem] = useState<string>('');
  
  const navigate = useNavigate();
  const { login } = useAuth(); // Pega a função de login do contexto

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/api/login', {
        email,
        senha,
      });

      const { token, user } = response.data;
      
      login(token, user); // Chama a função que atualiza o estado
      
      navigate('/'); // Redireciona imediatamente após a atualização
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setMensagem('Erro: ' + (error.response.data.error || 'Erro no servidor'));
        console.error('Erro de login:', error.response.data);
      } else {
        setMensagem('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        console.error('Erro de login:', error);
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Login de Usuário</h2>
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
      {mensagem && <p style={{ marginTop: '1rem', color: mensagem.startsWith('Erro') ? 'red' : 'green' }}>{mensagem}</p>}
    </div>
  );
};

export default Login;