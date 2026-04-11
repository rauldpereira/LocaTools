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
      await axios.put(`${import.meta.env.VITE_API_URL}/api/profile`, { nome, email }, {
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

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        setMensagem('Erro: A nova senha deve ter no mínimo 8 caracteres e conter letras e números.');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Token de autenticação não encontrado.');
          return;
        }
        await axios.put(`${import.meta.env.VITE_API_URL}/api/profile/password`, {
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
        <button onClick={() => logout(true)}>Fazer Login</button>
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <input
              type="password"
              placeholder="Nova Senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <small style={{ color: '#666', fontSize: '0.8rem', marginTop: '4px' }}>
              Mínimo de 8 caracteres, com letras e números.
            </small>
        </div>
        <input
          type="password"
          placeholder="Confirmar Nova Senha"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
        />
        <button type="submit">Alterar Senha</button>
      </form>

      {mensagem && (
          <div style={{ 
              marginTop: '1rem', 
              padding: '10px', 
              backgroundColor: mensagem.startsWith('Erro') ? '#f8d7da' : '#d4edda',
              color: mensagem.startsWith('Erro') ? '#721c24' : '#155724',
              border: `1px solid ${mensagem.startsWith('Erro') ? '#f5c6cb' : '#c3e6cb'}`,
              borderRadius: '4px',
              maxWidth: '300px'
          }}>
              {mensagem}
          </div>
      )}

    </div>
  );
};

export default Profile;