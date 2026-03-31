import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Pesca o token da URL!
  const navigate = useNavigate();
  
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmSenha) return alert("As senhas não coincidem!");

    try {
      await axios.post('http://localhost:3001/api/reset-password', { token, novaSenha });
      alert("Senha alterada com sucesso! Faça login.");
      navigate('/auth'); // Manda o cara pro Login
    } catch (err: any) {
      alert(err.response?.data?.error || "Link inválido ou expirado!");
    }
  };

  if (!token) return <h2>Erro: Link inválido.</h2>;

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h2>Criar Nova Senha</h2>
      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <input 
          type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} 
          required placeholder="Nova Senha (mínimo 8 chars)" style={{ padding: '10px', width: '300px' }}
        />
        <input 
          type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} 
          required placeholder="Confirme a Senha" style={{ padding: '10px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white' }}>Salvar Nova Senha</button>
      </form>
    </div>
  );
};
export default ResetPasswordPage;