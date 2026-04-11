import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const PERMISSOES_DISPONIVEIS = [
  { id: 'gerenciar_reservas', nome: '📅 Gerenciar Reservas (Entregas e Saidas, OS)' },
  { id: 'gerenciar_estoque', nome: '📦 Gerenciar Estoque (Equipamentos)' },
  { id: 'receber_pagamentos', nome: '💲 Operar Caixa e Recebimentos (Sinal/Devolução)' },
  { id: 'ver_financeiro', nome: '📈 Relatórios e Dashboards Financeiros' },
  { id: 'fazer_vistoria', nome: '📸 Fazer Vistorias (Pátio/Motorista)' },
  { id: 'configuracoes', nome: '⚙️ Configurações (Frete, Feriados)' }
];

interface UsuarioEquipe {
  id: number;
  nome: string;
  email: string;
  cpf?: string;
  tipo_usuario: string;
  permissoes: string[];
}

const AdminTeamPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [equipe, setEquipe] = useState<UsuarioEquipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Permissões
  const [modalPermissoesAberto, setModalPermissoesAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioEquipe | null>(null);
  const [permissoesAtuais, setPermissoesAtuais] = useState<string[]>([]);

  // Modal de Criação
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [novoUser, setNovoUser] = useState({ nome: '', email: '', cpf: '', senha: '', tipo_usuario: 'funcionario' });

  // Modal de Edição (Dados, Senha e Cargo)
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState({ id: 0, nome: '', email: '', cpf: '', novaSenha: '', tipo_usuario: 'funcionario' });

  useEffect(() => {
    carregarEquipe();
  }, []);

  const getConfig = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const carregarEquipe = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/team`, getConfig());
      setEquipe(response.data);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
    } finally {
      setLoading(false);
    }
  };

  // MÁSCARA DE CPF 
  const applyCpfMask = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  // 🚀 VALIDADOR MATEMÁTICO DE CPF 🚀
  const validarCPF = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    
    // Bloqueia CPFs com todos os números iguais (ex: 00000000000)
    if (/^(\d)\1{10}$/.test(cpf)) return false; 

    let soma = 0;
    let resto;

    // Valida 1º dígito
    for (let i = 1; i <= 9; i++) {
      soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    // Valida 2º dígito
    for (let i = 1; i <= 10; i++) {
      soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  };

  // --- FUNÇÕES DE PERMISSÕES ---
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
      await axios.put(`${import.meta.env.VITE_API_URL}/api/team/${usuarioEditando.id}/permissions`, {
        permissoes: permissoesAtuais
      }, getConfig());
      alert('Permissões salvas com sucesso!');
      carregarEquipe();
      setModalPermissoesAberto(false);
    } catch (error) {
      alert('Erro ao salvar as permissões.');
    }
  };

  // --- FUNÇÕES DE CRIAÇÃO ---
  const criarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfLimpo = novoUser.cpf.replace(/\D/g, '');
    
    if (!validarCPF(cpfLimpo)) {
        return alert("CPF inválido! Verifique os números digitados e tente novamente.");
    }

    try {
      const payload = { ...novoUser, cpf: cpfLimpo };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/team`, payload, getConfig());
      alert('Colaborador criado com sucesso!');
      setModalCriarAberto(false);
      setNovoUser({ nome: '', email: '', cpf: '', senha: '', tipo_usuario: 'funcionario' });
      carregarEquipe();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar funcionário.');
    }
  };

  // --- FUNÇÕES DE EDIÇÃO DE DADOS E CARGO ---
  const abrirModalEditar = (usuario: UsuarioEquipe) => {
    setDadosEdicao({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf ? applyCpfMask(usuario.cpf) : '',
      novaSenha: '',
      tipo_usuario: usuario.tipo_usuario
    });
    setModalEditarAberto(true);
  };

  const salvarEdicaoDados = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfLimpo = dadosEdicao.cpf.replace(/\D/g, '');
    
    if (cpfLimpo && !validarCPF(cpfLimpo)) {
        return alert("CPF inválido! Verifique os números digitados e tente novamente.");
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/team/${dadosEdicao.id}/dados`, {
        nome: dadosEdicao.nome,
        email: dadosEdicao.email,
        cpf: cpfLimpo,
        senha: dadosEdicao.novaSenha || undefined,
        tipo_usuario: dadosEdicao.tipo_usuario
      }, getConfig());

      alert('Dados e acessos atualizados com sucesso!');
      setModalEditarAberto(false);
      carregarEquipe();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao atualizar funcionário.');
    }
  };

  const excluirUsuario = async (id: number, nome: string) => {
    if (window.confirm(`⚠️ ATENÇÃO!\nTem certeza que deseja EXCLUIR DEFINITIVAMENTE o usuário "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/team/${id}`, getConfig());
        alert('Usuário excluído com sucesso!');
        carregarEquipe();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Erro ao excluir usuário.');
      }
    }
  };

  if (loading) return <div>Carregando equipe...</div>;

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#333' }}>Gestão de Equipe e Acessos</h2>
        <button
          onClick={() => setModalCriarAberto(true)}
          style={{ backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Novo Colaborador
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', color: '#333', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Nome</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Email / CPF</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Cargo</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {equipe.map(user => {
              const isMainAdmin = user.email === 'admin@locatools.com';
              const isSelf = currentUser?.id === user.id;

              return (
                <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', color: '#666' }}>
                    {user.nome} {isSelf && <span style={{ color: '#007bff', fontSize: '0.8rem', fontWeight: 'bold' }}>(Você)</span>}
                  </td>
                  <td style={{ padding: '12px', color: '#666' }}>
                    <div>{user.email}</div>
                    <div style={{ fontSize: '0.85rem', color: '#999' }}>{user.cpf ? applyCpfMask(user.cpf) : 'CPF não registrado'}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      backgroundColor: user.tipo_usuario === 'admin' ? '#ffebee' : '#e6f7ff',
                      color: user.tipo_usuario === 'admin' ? '#dc3545' : '#007bff',
                      padding: '5px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
                    }}>
                      {user.tipo_usuario.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>

                    {/* BOTÃO EDITAR */}
                    <button
                      onClick={() => abrirModalEditar(user)}
                      style={{ backgroundColor: '#ffc107', color: '#212529', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                    >
                      ✏️ Editar
                    </button>

                    {/* BOTÃO PERMISSÕES */}
                    <button
                      onClick={() => abrirModalPermissoes(user)}
                      disabled={user.tipo_usuario === 'admin'}
                      style={{
                        backgroundColor: user.tipo_usuario === 'admin' ? '#ccc' : '#28a745',
                        color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '5px',
                        cursor: user.tipo_usuario === 'admin' ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem'
                      }}
                    >
                      {user.tipo_usuario === 'admin' ? 'Acesso Total' : '🔐 Permissões'}
                    </button>

                    <button
                      onClick={() => excluirUsuario(user.id, user.nome)}
                      disabled={isMainAdmin || isSelf} // Trava pra não apagar a si mesmo nem o dono
                      style={{
                        backgroundColor: (isMainAdmin || isSelf) ? '#e9ecef' : '#dc3545',
                        color: (isMainAdmin || isSelf) ? '#adb5bd' : '#fff',
                        border: 'none', padding: '8px 12px', borderRadius: '5px',
                        cursor: (isMainAdmin || isSelf) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem'
                      }}
                    >
                      🗑️ Excluir
                    </button>

                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL DE CRIAÇÃO DE FUNCIONÁRIO ================= */}
      {modalCriarAberto && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Cadastrar Novo Colaborador</h3>
            <form onSubmit={criarFuncionario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Nome Completo</label>
                <input required type="text" value={novoUser.nome} onChange={e => setNovoUser({ ...novoUser, nome: e.target.value })} style={inputStyle} />
              </div>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Email (Login)</label>
                  <input required type="email" value={novoUser.email} onChange={e => setNovoUser({ ...novoUser, email: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>CPF *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="000.000.000-00"
                    value={novoUser.cpf} 
                    onChange={e => setNovoUser({ ...novoUser, cpf: applyCpfMask(e.target.value) })} 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Senha Inicial</label>
                <input required type="password" value={novoUser.senha} onChange={e => setNovoUser({ ...novoUser, senha: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nível de Acesso (Cargo)</label>
                <select
                  value={novoUser.tipo_usuario}
                  onChange={e => setNovoUser({ ...novoUser, tipo_usuario: e.target.value })}
                  style={{ ...inputStyle, backgroundColor: novoUser.tipo_usuario === 'admin' ? '#ffebee' : '#fff', fontWeight: 'bold', color: novoUser.tipo_usuario === 'admin' ? '#c62828' : '#333' }}
                >
                  <option value="funcionario">Funcionário (Acesso Restrito)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
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

      {/* ================= MODAL DE EDIÇÃO DE DADOS ================= */}
      {modalEditarAberto && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Editar Colaborador</h3>
            <form onSubmit={salvarEdicaoDados} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Nome Completo</label>
                <input required type="text" value={dadosEdicao.nome} onChange={e => setDadosEdicao({ ...dadosEdicao, nome: e.target.value })} style={inputStyle} />
              </div>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Email (Login)</label>
                  <input required type="email" value={dadosEdicao.email} onChange={e => setDadosEdicao({ ...dadosEdicao, email: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>CPF *</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="000.000.000-00"
                    value={dadosEdicao.cpf} 
                    onChange={e => setDadosEdicao({ ...dadosEdicao, cpf: applyCpfMask(e.target.value) })} 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Nível de Acesso (Cargo)</label>
                <select
                  value={dadosEdicao.tipo_usuario}
                  onChange={e => setDadosEdicao({ ...dadosEdicao, tipo_usuario: e.target.value })}
                  disabled={dadosEdicao.id === currentUser?.id || dadosEdicao.email === 'admin@locatools.com'} // 👈 Não deixa rebaixar a si mesmo!
                  style={{
                    ...inputStyle,
                    backgroundColor: dadosEdicao.tipo_usuario === 'admin' ? '#ffebee' : '#fff',
                    fontWeight: 'bold',
                    color: dadosEdicao.tipo_usuario === 'admin' ? '#c62828' : '#333',
                    cursor: (dadosEdicao.id === currentUser?.id || dadosEdicao.email === 'admin@locatools.com') ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="funcionario">Funcionário (Acesso Restrito)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
                {dadosEdicao.id === currentUser?.id && (
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>*Você não pode alterar seu próprio cargo.</span>
                )}
              </div>

              <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeeba', marginTop: '10px' }}>
                <label style={{ ...labelStyle, color: '#856404' }}>Redefinir Senha</label>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#856404' }}>
                  A senha provisória padrão são os <strong>6 primeiros dígitos do CPF</strong> do colaborador.
                </p>
                
                {dadosEdicao.novaSenha ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb', color: '#155724' }}>
                    <strong>✅ A senha será os 6 primeiros dígitos do CPF do usuário.</strong>
                    <button type="button" onClick={() => setDadosEdicao({...dadosEdicao, novaSenha: ''})} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', textDecoration: 'underline' }}>
                      Cancelar Reset
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const cpfLimpo = dadosEdicao.cpf.replace(/\D/g, '');
                      if (cpfLimpo.length === 11) {
                        setDadosEdicao({ ...dadosEdicao, novaSenha: cpfLimpo.substring(0, 6) });
                      } else {
                        alert("Preencha os 11 dígitos do CPF do colaborador antes de resetar a senha!");
                      }
                    }}
                    style={{ padding: '8px 15px', backgroundColor: '#ffc107', color: '#856404', border: '1px solid #d39e00', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    🔄 Resetar Senha Provisória (CPF)
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={() => setModalEditarAberto(false)} style={{ padding: '10px 20px', border: 'none', borderRadius: '5px', backgroundColor: '#6c757d', color: '#fff', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', borderRadius: '5px', backgroundColor: '#28a745', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                  Salvar Alterações
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
            <h3 style={{ marginTop: 0, color: '#333' }}>Acessos Restritos de: {usuarioEditando.nome}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              Selecione as áreas que este <strong>funcionário</strong> terá acesso no painel:
            </p>
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

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '550px', boxShadow: '0 5px 25px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto'
};
const labelStyle: React.CSSProperties = {
  fontWeight: 'bold', color: '#333', marginBottom: '5px', display: 'block'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box'
};

export default AdminTeamPage;