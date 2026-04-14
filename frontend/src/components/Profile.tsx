import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [rg, setRg] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [mensagemPerfil, setMensagemPerfil] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [error, setError] = useState<string | null>(null);

  const maskPhone = (value: string) => {
    const num = value.replace(/\D/g, '').substring(0, 11);
    if (num.length <= 10) {
      return num.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return num.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const maskRG = (value: string) => {
    const clean = value.replace(/[^\dX]/gi, '').toUpperCase().substring(0, 9);
    return clean
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})([\dX])/, '$1-$2');
  };

  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setEmail(user.email || '');
      setTelefone(maskPhone(user.telefone || ''));
      setRg(maskRG(user.rg || ''));
      setRazaoSocial(user.razao_social || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemPerfil('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token de autenticação não encontrado.');
        return;
      }
      const payload = { 
        nome, 
        email, 
        telefone, 
        rg: user?.tipo_pessoa === 'fisica' ? rg : undefined,
        razao_social: user?.tipo_pessoa === 'juridica' ? razaoSocial : undefined
      };

      await axios.put(`${import.meta.env.VITE_API_URL}/api/profile`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMensagemPerfil('Perfil atualizado com sucesso!');
      updateUser(payload);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setMensagemPerfil('Erro: ' + (err.response.data.error || 'Erro ao atualizar.'));
      } else {
        setMensagemPerfil('Erro desconhecido.');
      }
      console.error(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemSenha('');
    
    if (newPassword !== confirmNewPassword) {
        setMensagemSenha('Erro: As novas senhas não coincidem.');
        return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        setMensagemSenha('Erro: A nova senha deve ter no mínimo 8 caracteres e conter letras e números.');
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
        
        setMensagemSenha('Senha alterada com sucesso!');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setMensagemSenha('Erro: ' + (err.response.data.error || 'Erro ao alterar a senha.'));
      } else {
        setMensagemSenha('Erro desconhecido.');
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
    <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '60px auto' }}>
      <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Perfil do Usuário</h2>
      
      <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div style={fieldContainerStyle}>
          <label style={labelStyle}>Nome Completo</label>
          <input
            type="text"
            style={inputStyle}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>E-mail</label>
          <input
            type="email"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>Telefone</label>
          <input
            type="text"
            style={inputStyle}
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        </div>

        {user.tipo_pessoa === 'fisica' ? (
          <>
            <div style={fieldContainerStyle}>
              <label style={labelStyle}>CPF (Não alterável)</label>
              <input
                type="text"
                style={{ ...inputStyle, backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                value={user.cpf || ''}
                readOnly
              />
            </div>
            <div style={fieldContainerStyle}>
              <label style={labelStyle}>RG</label>
              <input
                type="text"
                style={inputStyle}
                value={rg}
                onChange={(e) => setRg(maskRG(e.target.value))}
                placeholder="00.000.000-0"
                maxLength={12}
              />
            </div>
          </>
        ) : (
          <>
            <div style={fieldContainerStyle}>
              <label style={labelStyle}>CNPJ (Não alterável)</label>
              <input
                type="text"
                style={{ ...inputStyle, backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                value={user.cnpj || ''}
                readOnly
              />
            </div>
            <div style={fieldContainerStyle}>
              <label style={labelStyle}>Razão Social</label>
              <input
                type="text"
                style={inputStyle}
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
              />
            </div>
          </>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" style={buttonStyle}>Atualizar Dados</button>
          {mensagemPerfil && (
            <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                backgroundColor: mensagemPerfil.startsWith('Erro') ? '#f8d7da' : '#d4edda',
                color: mensagemPerfil.startsWith('Erro') ? '#721c24' : '#155724',
                border: `1px solid ${mensagemPerfil.startsWith('Erro') ? '#f5c6cb' : '#c3e6cb'}`,
                borderRadius: '6px',
            }}>
                {mensagemPerfil}
            </div>
          )}
        </div>
      </form>
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #ddd' }} />

      <h3 style={{ marginBottom: '1.5rem' }}>Segurança - Alterar Senha</h3>
      <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div style={fieldContainerStyle}>
          <label style={labelStyle}>Senha Antiga</label>
          <input
            type="password"
            style={inputStyle}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </div>

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>Nova Senha</label>
          <input
            type="password"
            style={inputStyle}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px' }}>
            Mínimo de 8 caracteres, com letras e números.
          </small>
        </div>

        <div style={fieldContainerStyle}>
          <label style={labelStyle}>Confirmar Nova Senha</label>
          <input
            type="password"
            style={inputStyle}
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" style={{ ...buttonStyle, backgroundColor: '#6c757d' }}>Alterar Senha</button>
          {mensagemSenha && (
            <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                backgroundColor: mensagemSenha.startsWith('Erro') ? '#f8d7da' : '#d4edda',
                color: mensagemSenha.startsWith('Erro') ? '#721c24' : '#155724',
                border: `1px solid ${mensagemSenha.startsWith('Erro') ? '#f5c6cb' : '#c3e6cb'}`,
                borderRadius: '6px',
            }}>
                {mensagemSenha}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

const fieldContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#444',
};

const inputStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '1rem',
  outline: 'none',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: '600',
  transition: 'background-color 0.2s',
};

export default Profile;