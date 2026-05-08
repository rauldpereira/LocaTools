import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, X, ShieldAlert, KeyRound, UserCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [mensagemPerfil, setMensagemPerfil] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [showManual, setShowManual] = useState(false);

  const maskPhone = (value: string) => {
    const num = value.replace(/\D/g, '').substring(0, 11);
    if (num.length <= 10) {
      return num.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return num.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setEmail(user.email || '');
      setTelefone(maskPhone(user.telefone || ''));
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
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
          <UserCircle size={28} color="#3b82f6" /> Perfil do Usuário
        </h2>
        <button
            onClick={() => setShowManual(true)}
            title="Manual do Usuário"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}
          >
            <HelpCircle size={20} />
        </button>
      </div>
      
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
          <div style={fieldContainerStyle}>
            <label style={labelStyle}>CPF</label>
            <input
              type="text"
              style={{ ...inputStyle, backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
              value={user.cpf || ''}
              readOnly
            />
          </div>
        ) : (
          <>
            <div style={fieldContainerStyle}>
              <label style={labelStyle}>CNPJ</label>
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
      <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ ...fieldContainerStyle, maxWidth: '400px' }}>
          <label style={labelStyle}>Senha Antiga</label>
          <input
            type="password"
            style={inputStyle}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
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
        </div>

        <div>
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

      {/* MODAL MANUAL */}
      {showManual && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, animation: "fadeIn 0.2s ease" }} onClick={() => setShowManual(false)}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "90%", maxWidth: "600px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 30px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Gestão de Perfil
              </h3>
              <button onClick={() => setShowManual(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}><X size={22} /></button>
            </div>

            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1 }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>
                  Mantenha seus dados atualizados para garantir que os contratos de locação sejam gerados corretamente.
                </p>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}><UserCircle size={14} /></div>
                  <div>
                    <strong>Dados Cadastrais e Contratuais:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>O Nome e o Telefone que você preencher aqui serão impressos automaticamente nos seus Termos de Responsabilidade e Contratos de Locação. Mantenha-os sempre atualizados.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#fef2f2", borderRadius: "12px", border: "1px solid #fecaca" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#ef4444", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}><ShieldAlert size={14} /></div>
                  <div>
                    <strong>Documento de Identificação (CPF/CNPJ):</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Por questões de segurança e integridade contratual, o seu documento (CPF ou CNPJ) é travado após o cadastro inicial e não pode ser alterado por esta tela. Caso precise corrigir, entre em contato com o suporte da LocaTools.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}><KeyRound size={14} /></div>
                  <div>
                    <strong>Segurança da Conta:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Você pode trocar sua senha a qualquer momento. Lembre-se que a nova senha precisa ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
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