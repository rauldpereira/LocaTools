import React, { useState } from 'react';
import axios from 'axios';
import { AxiosError } from 'axios';

const Register: React.FC = () => {
  const [nome, setNome] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [confirmarSenha, setConfirmarSenha] = useState<string>('');
  const [mensagem, setMensagem] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (senha !== confirmarSenha) {
      setMensagem('Erro: As senhas não coincidem.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/api/register', {
        nome,
        email,
        senha,
      });
      setMensagem(response.data.message);
      console.log('Registro bem-sucedido:', response.data);
      setNome('');
      setEmail('');
      setSenha('');
      setConfirmarSenha('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const axiosError = error as AxiosError; 
        const errorMessage =
          (axiosError.response?.data as { error?: string })?.error || 'Erro no servidor';
        setMensagem('Erro: ' + errorMessage);
        console.error('Erro de registro:', axiosError.response?.data || axiosError);
      } else {
        setMensagem('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        console.error('Erro de registro:', error);
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Registro de Usuário</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
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
        <input
          type="password"
          placeholder="Confirmar Senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          required
        />
        <button type="submit">Registrar</button>
      </form>
      {mensagem && <p style={{ marginTop: '1rem', color: mensagem.startsWith('Erro') ? 'red' : 'green' }}>{mensagem}</p>}
    </div>
  );
};

export default Register;