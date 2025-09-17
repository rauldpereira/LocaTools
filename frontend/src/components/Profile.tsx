import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNome(user.nome);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token de autenticação não encontrado.');
        return;
      }
      await axios.put('http://localhost:3001/api/profile', { nome, email }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMensagem('Perfil atualizado com sucesso!');
      updateUser({ nome, email });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setMensagem('Erro: ' + (err.response.data.error || 'Erro ao atualizar.'));
      } else {
        setMensagem('Erro desconhecido.');
      }
      console.error(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
        setMensagem('Erro: As novas senhas não coincidem.');
        return;
    }
    try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Token de autenticação não encontrado.');
          return;
        }
        await axios.put('http://localhost:3001/api/profile/password', {
            old_senha: oldPassword,
            new_senha: newPassword,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setMensagem('Senha alterada com sucesso!');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setMensagem('Erro: ' + (err.response.data.error || 'Erro ao alterar a senha.'));
      } else {
        setMensagem('Erro desconhecido.');
      }
      console.error(err);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        {error}
        <button onClick={logout}>Fazer Login</button>
      </div>
    );
  }

  if (!user) {
    return <div style={{ padding: '2rem' }}>Carregando perfil...</div>;
  }

  return (
    <div style={{ padding: '2rem', marginTop: '60px' }}>
      <h2>Perfil do Usuário</h2>
      <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
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
        <button type="submit">Atualizar Perfil</button>
      </form>
      {mensagem && <p style={{ marginTop: '1rem', color: mensagem.startsWith('Erro') ? 'red' : 'green' }}>{mensagem}</p>}
      
      <hr style={{ margin: '2rem 0' }} />

      <h3>Alterar Senha</h3>
      <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
        <input
          type="password"
          placeholder="Senha Antiga"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Nova Senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmar Nova Senha"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
        />
        <button type="submit">Alterar Senha</button>
      </form>
    </div>
  );
};

export default Profile;