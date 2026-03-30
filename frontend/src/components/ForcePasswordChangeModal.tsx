import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ForcePasswordChangeModal: React.FC = () => {
  const { user, token } = useAuth();
  const [newSenha, setNewSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || !user.precisa_trocar_senha) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newSenha !== confirmSenha) {
        return alert('As senhas não coincidem! Digite a mesma senha nos dois campos.');
    }

    setLoading(true);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.put('http://localhost:3001/api/profile/password', {
        new_senha: newSenha
      }, config);

      alert('✅ Senha alterada com segurança! Você já pode continuar trabalhando.');
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        window.location.reload(); 
      }

    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao tentar mudar a senha.');
      setLoading(false);
    } 
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ marginTop: 0, color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Atualização Obrigatória
        </h2>
        <p style={{ color: '#555', fontSize: '0.95rem', marginBottom: '20px' }}>
          Sua senha foi redefinida recentemente. Por motivos de segurança, você precisa criar uma <strong>nova senha</strong> antes de acessar o sistema.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>Nova Senha</label>
            <input 
              required 
              type="password" 
              placeholder="Mínimo 8 caracteres (letras e números)"
              value={newSenha} 
              onChange={e => setNewSenha(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>Confirme sua nova senha</label>
            <input 
              required 
              type="password" 
              placeholder="Repita a senha acima"
              value={confirmSenha} 
              onChange={e => setConfirmSenha(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || newSenha.length < 8}
            style={{ marginTop: '10px', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: (loading || newSenha.length < 8) ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Salvando...' : 'Salvar Nova Senha e Acessar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;