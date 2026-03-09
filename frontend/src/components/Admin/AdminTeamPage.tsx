import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PERMISSOES_DISPONIVEIS = [
  { id: 'gerenciar_reservas', nome: '📅 Gerenciar Reservas (Balcão e OS)' },
  { id: 'gerenciar_estoque', nome: '📦 Gerenciar Estoque (Equipamentos)' },
  { id: 'ver_financeiro', nome: '💰 Financeiro e Relatórios' },
  { id: 'fazer_vistoria', nome: '📸 Fazer Vistorias (Pátio/Motorista)' },
  { id: 'configuracoes', nome: '⚙️ Configurações (Frete, Feriados)' }
];

interface UsuarioEquipe {
  id: number;
  nome: string;
  email: string;
  tipo_usuario: string;
  permissoes: string[];
}

const AdminTeamPage: React.FC = () => {
  const [equipe, setEquipe] = useState<UsuarioEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de Permissões
  const [modalPermissoesAberto, setModalPermissoesAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioEquipe | null>(null);
  const [permissoesAtuais, setPermissoesAtuais] = useState<string[]>([]);

  // Modal de Criação
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [novoUser, setNovoUser] = useState({ nome: '', email: '', senha: '' });

  useEffect(() => {
    carregarEquipe();
  }, []);

  const carregarEquipe = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/team');
      setEquipe(response.data);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÕES DO MODAL DE PERMISSÕES ---
  const abrirModalPermissoes = (usuario: UsuarioEquipe) => {
    setUsuarioEditando(usuario);
    setPermissoesAtuais(Array.isArray(usuario.permissoes) ? usuario.permissoes : []);
    setModalPermissoesAberto(true);
  };

  const togglePermissao = (permissaoId: string) => {
    if (permissoesAtuais.includes(permissaoId)) {
      setPermissoesAtuais(permissoesAtuais.filter(p => p !== permissaoId));
    } else {
      setPermissoesAtuais([...permissoesAtuais, permissaoId]);
    }
  };

  const salvarPermissoes = async () => {
    if (!usuarioEditando) return;
    try {
      await axios.put(`http://localhost:3001/api/team/${usuarioEditando.id}/permissions`, {
        permissoes: permissoesAtuais
      });
      alert('Permissões salvas com sucesso!');
      carregarEquipe();
      setModalPermissoesAberto(false);
    } catch (error) {
      alert('Erro ao salvar as permissões.');
    }
  };

  // --- FUNÇÕES DO MODAL DE CRIAÇÃO ---
  const criarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/team', novoUser);
      alert('Colaborador criado com sucesso!');
      setModalCriarAberto(false);
      setNovoUser({ nome: '', email: '', senha: '' });
      carregarEquipe();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar funcionário.');
    }
  };

  if (loading) return <div>Carregando equipe...</div>;

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Gestão de Funcionários</h2>
        <button 
          onClick={() => setModalCriarAberto(true)}
          style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Novo Colaborador
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', color: '#333', textAlign: 'left' }}>
            <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Nome</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Email</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Cargo</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {equipe.map(user => (
            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px', color: '#666' }}>{user.nome}</td>
              <td style={{ padding: '12px', color: '#666' }}>{user.email}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ 
                  backgroundColor: user.tipo_usuario === 'admin' ? '#ffebee' : '#e6f7ff', 
                  color: user.tipo_usuario === 'admin' ? '#dc3545' : '#007bff',
                  padding: '5px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' 
                }}>
                  {user.tipo_usuario.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <button 
                  onClick={() => abrirModalPermissoes(user)}
                  disabled={user.tipo_usuario === 'admin'}
                  style={{
                    backgroundColor: user.tipo_usuario === 'admin' ? '#ccc' : '#28a745',
                    color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px',
                    cursor: user.tipo_usuario === 'admin' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {user.tipo_usuario === 'admin' ? 'Acesso Total' : 'Permissões'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= MODAL DE CRIAÇÃO DE FUNCIONÁRIO ================= */}
      {modalCriarAberto && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Cadastrar Novo Colaborador</h3>
            <form onSubmit={criarFuncionario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Nome Completo</label>
                <input required type="text" value={novoUser.nome} onChange={e => setNovoUser({...novoUser, nome: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email (Login)</label>
                <input required type="email" value={novoUser.email} onChange={e => setNovoUser({...novoUser, email: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Senha Inicial</label>
                <input required type="password" value={novoUser.senha} onChange={e => setNovoUser({...novoUser, senha: e.target.value})} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalCriarAberto(false)} style={{ padding: '10px 20px', border: 'none', borderRadius: '5px', backgroundColor: '#6c757d', color: '#fff', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', borderRadius: '5px', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE EDIÇÃO DE PERMISSÕES ================= */}
      {modalPermissoesAberto && usuarioEditando && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Acessos de: {usuarioEditando.nome}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {PERMISSOES_DISPONIVEIS.map(perm => {
                const temAcesso = permissoesAtuais.includes(perm.id);
                return (
                  <label key={perm.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', backgroundColor: temAcesso ? '#eafaf1' : '#f8f9fa', borderRadius: '8px', border: `1px solid ${temAcesso ? '#28a745' : '#ddd'}` }}>
                    <input 
                      type="checkbox" 
                      checked={temAcesso}
                      onChange={() => togglePermissao(perm.id)}
                      style={{ width: '20px', height: '20px', marginRight: '15px' }}
                    />
                    <span style={{ fontWeight: temAcesso ? 'bold' : 'normal', color: temAcesso ? '#155724' : '#555' }}>
                      {perm.nome}
                    </span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' }}>
              <button onClick={() => setModalPermissoesAberto(false)} style={{ padding: '10px 20px', border: 'none', borderRadius: '5px', backgroundColor: '#6c757d', color: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={salvarPermissoes} style={{ padding: '10px 20px', border: 'none', borderRadius: '5px', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                Salvar Permissões
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 5px 25px rgba(0,0,0,0.2)'
};
const labelStyle: React.CSSProperties = {
  fontWeight: 'bold', color: '#333', marginBottom: '5px', display: 'block'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box'
};

export default AdminTeamPage;