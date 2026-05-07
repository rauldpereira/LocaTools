import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Key, 
  Trash2, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Mail, 
  Briefcase,
  Lock,
  Unlock,
  RefreshCw,
  Save,
  Calendar,
  Package,
  CircleDollarSign,
  TrendingUp,
  Camera,
  Settings,
  Loader2,
  KeyRound,
  HelpCircle
} from 'lucide-react';

const PERMISSOES_DISPONIVEIS = [
  { id: 'gerenciar_reservas', nome: 'Gerenciar Reservas (Entregas e Saídas, OS)', icon: <Calendar size={16} /> },
  { id: 'gerenciar_estoque', nome: 'Gerenciar Estoque (Equipamentos)', icon: <Package size={16} /> },
  { id: 'receber_pagamentos', nome: 'Operar Caixa e Recebimentos', icon: <CircleDollarSign size={16} /> },
  { id: 'ver_financeiro', nome: 'Relatórios e Dashboards Financeiros', icon: <TrendingUp size={16} /> },
  { id: 'fazer_vistoria', nome: 'Fazer Vistorias (Pátio/Motorista)', icon: <Camera size={16} /> },
  { id: 'configuracoes', nome: 'Configurações (Frete, Feriados)', icon: <Settings size={16} /> }
];

interface UsuarioEquipe {
  id: number;
  nome: string;
  email: string;
  cpf?: string;
  tipo_usuario: string;
  permissoes: string[];
  ativo: boolean;
}

const AdminTeamPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [equipe, setEquipe] = useState<UsuarioEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modais
  const [showManual, setShowManual] = useState(false);
  const [modalPermissoesAberto, setModalPermissoesAberto] = useState(false);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [modalBloquearAberto, setModalBloquearAberto] = useState(false);

  // Estados de Operação
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioEquipe | null>(null);
  const [permissoesAtuais, setPermissoesAtuais] = useState<string[]>([]);
  const [novoUser, setNovoUser] = useState({ nome: '', email: '', cpf: '', senha: '', tipo_usuario: 'funcionario' });
  const [dadosEdicao, setDadosEdicao] = useState({ id: 0, nome: '', email: '', cpf: '', novaSenha: '', tipo_usuario: 'funcionario' });
  const [opLoading, setOpLoading] = useState(false);
  const [opError, setOpError] = useState('');

  useEffect(() => {
    carregarEquipe();
  }, []);

  const getConfig = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const carregarEquipe = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/team`, getConfig());
      setEquipe(response.data);
    } catch (error) {
      console.error('Erro ao carregar equipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyCpfMask = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const validarCPF = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false; 
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  const filteredTeam = equipe.filter(member => {
    const term = searchTerm.toLowerCase();
    return (
      member.nome.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      (member.cpf && member.cpf.includes(term))
    );
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- PERMISSÕES ---
  const abrirModalPermissoes = (usuario: UsuarioEquipe) => {
    setUsuarioEditando(usuario);
    setPermissoesAtuais(Array.isArray(usuario.permissoes) ? usuario.permissoes : []);
    setOpError('');
    setModalPermissoesAberto(true);
  };

  const togglePermissao = (permissaoId: string) => {
    setPermissoesAtuais(prev => prev.includes(permissaoId) ? prev.filter(p => p !== permissaoId) : [...prev, permissaoId]);
  };

  const salvarPermissoes = async () => {
    if (!usuarioEditando) return;
    setOpLoading(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/team/${usuarioEditando.id}/permissions`, { permissoes: permissoesAtuais }, getConfig());
      showSuccess('Acessos atualizados!');
      carregarEquipe();
      setModalPermissoesAberto(false);
    } catch (error) {
      setOpError('Erro ao salvar as permissões.');
    } finally {
      setOpLoading(false);
    }
  };

  // --- CRIAÇÃO ---
  const criarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfLimpo = novoUser.cpf.replace(/\D/g, '');
    if (!validarCPF(cpfLimpo)) return setOpError("CPF inválido!");
    
    setOpLoading(true);
    setOpError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/team`, { ...novoUser, cpf: cpfLimpo }, getConfig());
      showSuccess('Colaborador criado!');
      setModalCriarAberto(false);
      setNovoUser({ nome: '', email: '', cpf: '', senha: '', tipo_usuario: 'funcionario' });
      carregarEquipe();
    } catch (error: any) {
      setOpError(error.response?.data?.error || 'Erro ao criar funcionário.');
    } finally {
      setOpLoading(false);
    }
  };

  // --- EDIÇÃO ---
  const abrirModalEditar = (usuario: UsuarioEquipe) => {
    setDadosEdicao({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf ? applyCpfMask(usuario.cpf) : '',
      novaSenha: '',
      tipo_usuario: usuario.tipo_usuario
    });
    setOpError('');
    setModalEditarAberto(true);
  };

  const salvarEdicaoDados = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfLimpo = dadosEdicao.cpf.replace(/\D/g, '');
    if (cpfLimpo && !validarCPF(cpfLimpo)) return setOpError("CPF inválido!");

    setOpLoading(true);
    setOpError('');
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/team/${dadosEdicao.id}/dados`, {
        ...dadosEdicao, cpf: cpfLimpo, senha: dadosEdicao.novaSenha || undefined
      }, getConfig());
      showSuccess('Dados atualizados!');
      setModalEditarAberto(false);
      carregarEquipe();
    } catch (error: any) {
      setOpError(error.response?.data?.error || 'Erro ao atualizar.');
    } finally {
      setOpLoading(false);
    }
  };

  // --- EXCLUSÃO ---
  const abrirModalExcluir = (usuario: UsuarioEquipe) => {
    setUsuarioEditando(usuario);
    setOpError('');
    setModalExcluirAberto(true);
  };

  const executeExcluir = async () => {
    if (!usuarioEditando) return;
    setOpLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/team/${usuarioEditando.id}`, getConfig());
      showSuccess('Usuário removido!');
      carregarEquipe();
      setModalExcluirAberto(false);
    } catch (error: any) {
      setOpError(error.response?.data?.error || 'Erro ao excluir.');
    } finally {
      setOpLoading(false);
    }
  };

  // --- BLOQUEIO ---
  const abrirModalBloquear = (usuario: UsuarioEquipe) => {
    if (usuario.id === currentUser?.id) {
       alert("Você não pode bloquear a sua própria conta!");
       return;
    }
    setUsuarioEditando(usuario);
    setOpError('');
    setModalBloquearAberto(true);
  };

  const toggleStatusUsuario = async () => {
    if (!usuarioEditando) return;
    if (usuarioEditando.id === currentUser?.id) {
       setOpError("Você não pode bloquear a sua própria conta!");
       return;
    }
    setOpLoading(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/team/${usuarioEditando.id}/toggle-ativo`, {}, getConfig());
      showSuccess(`Usuário ${usuarioEditando.ativo ? 'bloqueado' : 'desbloqueado'}!`);
      carregarEquipe();
      setModalBloquearAberto(false);
    } catch (error: any) {
      setOpError(error.response?.data?.error || 'Erro ao alterar status.');
    } finally {
      setOpLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "100px", color: "#64748b" }}>Carregando equipe...</div>;

  return (
    <div style={{ animation: "fadeIn 0.3s ease", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.6rem", fontWeight: 800 }}>Equipe e Acessos</h2>
        <button 
          onClick={() => setShowManual(true)}
          title="Manual do Usuário"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "45px", height: "45px", borderRadius: "50%", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2563eb"; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "#64748b"; }}
        >
          <HelpCircle size={24} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff', padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', flexGrow: 1, maxWidth: '450px', boxShadow: "0 2px 4px rgba(0,0,0,0.02)", height: '45px', boxSizing: 'border-box' }}>
          <Search size={18} color="#94a3b8" />
          <input type="text" placeholder="Buscar por nome, email ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#334155' }} />
        </div>
        <button onClick={() => { setOpError(''); setModalCriarAberto(true); }} style={{...primaryBtnStyle, height: '45px'}}><UserPlus size={20} /> Novo Colaborador</button>
      </div>

      {successMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", backgroundColor: "#ecfdf5", border: "1px solid #10b981", borderRadius: "8px", color: "#047857", marginBottom: "20px", fontWeight: "bold", animation: "fadeIn 0.3s ease" }}>
          <CheckCircle size={18} color="#10b981" /> {successMsg}
        </div>
      )}

      <div style={{ backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
              <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Users size={14}/> Nome</div></th>
              <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Mail size={14}/> Email / CPF</div></th>
              <th style={thStyle}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Briefcase size={14}/> Cargo</div></th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeam.map(user => {
              const isMainAdmin = user.email === 'admin@locatools.com';
              const isSelf = currentUser?.id === user.id;
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: "background 0.2s", opacity: user.ativo ? 1 : 0.6 }} className="table-row-hover">
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '700', color: user.ativo ? '#1e293b' : '#94a3b8' }}>{user.nome} {isSelf && <span style={{ marginLeft: "8px", backgroundColor: "#dbeafe", color: "#2563eb", padding: "2px 8px", borderRadius: "10px", fontSize: "0.7rem" }}>VOCÊ</span>}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: user.ativo ? "#475569" : "#94a3b8" }}>{user.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ backgroundColor: "#f1f5f9", padding: "1px 4px", borderRadius: "4px", fontWeight: "800", color: "#64748b", fontSize: "0.65rem" }}>CPF</span>
                      {user.cpf ? applyCpfMask(user.cpf) : 'Não registrado'}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ backgroundColor: user.tipo_usuario === 'admin' ? '#fef2f2' : '#eff6ff', color: user.tipo_usuario === 'admin' ? '#ef4444' : '#3b82f6', padding: '5px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', textTransform: "uppercase" }}>{user.tipo_usuario}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={() => abrirModalEditar(user)} title="Editar Dados" style={iconBtnStyle}><Edit2 size={16} /></button>
                      
                      <button 
                        onClick={() => abrirModalBloquear(user)} 
                        disabled={isSelf}
                        title={isSelf ? "Não pode bloquear a si mesmo" : (user.ativo ? "Bloquear Acesso" : "Desbloquear Acesso")} 
                        style={{ 
                          ...iconBtnStyle, 
                          color: isSelf ? '#cbd5e1' : (user.ativo ? '#10b981' : '#ef4444'), 
                          borderColor: isSelf ? '#f1f5f9' : (user.ativo ? '#d1fae5' : '#fecaca'), 
                          backgroundColor: isSelf ? '#f8fafc' : (user.ativo ? '#f0fdf4' : '#fff'),
                          cursor: isSelf ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {user.ativo ? <Unlock size={16} /> : <Lock size={16} />}
                      </button>

                      <button onClick={() => abrirModalPermissoes(user)} disabled={user.tipo_usuario === 'admin'} title={user.tipo_usuario === 'admin' ? 'Acesso Total' : 'Configurar Acessos'} style={{ ...iconBtnStyle, color: user.tipo_usuario === 'admin' ? '#94a3b8' : '#2563eb', cursor: user.tipo_usuario === 'admin' ? 'not-allowed' : 'pointer' }}>
                        <Key size={16} />
                      </button>
                      
                      <button onClick={() => abrirModalExcluir(user)} disabled={isMainAdmin || isSelf} title="Excluir" style={{ ...iconBtnStyle, color: (isMainAdmin || isSelf) ? '#cbd5e1' : '#ef4444', cursor: (isMainAdmin || isSelf) ? 'not-allowed' : 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL CRIAR */}
      {modalCriarAberto && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Novo Colaborador</h3>
              <button onClick={() => setModalCriarAberto(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>
            {opError && <div style={errorBoxStyle}><AlertTriangle size={18} /> {opError}</div>}
            <form onSubmit={criarFuncionario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={labelStyle}>Nome Completo</label><input required type="text" value={novoUser.nome} onChange={e => setNovoUser({ ...novoUser, nome: e.target.value })} style={inputStyle} /></div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Email (Login)</label><input required type="email" value={novoUser.email} onChange={e => setNovoUser({ ...novoUser, email: e.target.value })} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>CPF</label><input required type="text" placeholder="000.000.000-00" value={novoUser.cpf} onChange={e => setNovoUser({ ...novoUser, cpf: applyCpfMask(e.target.value) })} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Senha Inicial</label><input required type="password" value={novoUser.senha} onChange={e => setNovoUser({ ...novoUser, senha: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Nível de Acesso</label>
                <select value={novoUser.tipo_usuario} onChange={e => setNovoUser({ ...novoUser, tipo_usuario: e.target.value })} style={{ ...inputStyle, fontWeight: 'bold' }}>
                  <option value="funcionario">Funcionário (Acesso Restrito)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>
              <button type="submit" disabled={opLoading} style={{ ...submitBtnStyle, marginTop: "10px" }}>{opLoading ? <Loader2 size={18} className="spin-animation" /> : <UserPlus size={18} />} {opLoading ? 'Cadastrando...' : 'Cadastrar'}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {modalEditarAberto && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Editar Colaborador</h3>
              <button onClick={() => setModalEditarAberto(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>
            {opError && <div style={errorBoxStyle}><AlertTriangle size={18} /> {opError}</div>}
            <form onSubmit={salvarEdicaoDados} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={labelStyle}>Nome Completo</label><input required type="text" value={dadosEdicao.nome} onChange={e => setDadosEdicao({ ...dadosEdicao, nome: e.target.value })} style={inputStyle} /></div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Email (Login)</label><input required type="email" value={dadosEdicao.email} onChange={e => setDadosEdicao({ ...dadosEdicao, email: e.target.value })} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>CPF</label><input required type="text" placeholder="000.000.000-00" value={dadosEdicao.cpf} onChange={e => setDadosEdicao({ ...dadosEdicao, cpf: applyCpfMask(e.target.value) })} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Cargo</label>
                <select value={dadosEdicao.tipo_usuario} onChange={e => setDadosEdicao({ ...dadosEdicao, tipo_usuario: e.target.value })} disabled={dadosEdicao.id === currentUser?.id || dadosEdicao.email === 'admin@locatools.com'} style={inputStyle}>
                  <option value="funcionario">Funcionário</option><option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ ...labelStyle, marginBottom: "10px" }}><KeyRound size={16} style={{ verticalAlign: "middle", marginRight: "5px" }} /> Senha</label>
                {dadosEdicao.novaSenha ? (
                  <div style={{ color: '#10b981', fontWeight: "bold", fontSize: "0.9rem" }}>✅ Senha será resetada para os 6 dígitos do CPF. <button type="button" onClick={() => setDadosEdicao({...dadosEdicao, novaSenha: ''})} style={{ color: "#ef4444", border: "none", background: "none", cursor: "pointer", textDecoration: "underline", marginLeft: "10px" }}>Desfazer</button></div>
                ) : (
                  <button type="button" onClick={() => { const c = dadosEdicao.cpf.replace(/\D/g, ''); if(c.length===11) setDadosEdicao({...dadosEdicao, novaSenha: c.substring(0,6)}); else alert("Preencha o CPF!"); }} style={{ backgroundColor: "#fff", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}><RefreshCw size={14} /> Resetar p/ 6 dígitos do CPF</button>
                )}
              </div>
              <button type="submit" disabled={opLoading} style={submitBtnStyle}>{opLoading ? <Loader2 size={18} className="spin-animation" /> : <Save size={18} />} {opLoading ? 'Salvando...' : 'Salvar Alterações'}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BLOQUEAR/ATIVAR */}
      {modalBloquearAberto && usuarioEditando && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "400px", textAlign: "center" }}>
            <div style={{ backgroundColor: usuarioEditando.ativo ? "#ecfdf5" : "#fef2f2", padding: "15px", borderRadius: "50%", width: "fit-content", margin: "0 auto 15px auto" }}>
              {usuarioEditando.ativo ? <Unlock size={32} color="#10b981" /> : <Lock size={32} color="#ef4444" />}
            </div>
            <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>{usuarioEditando.ativo ? "Bloquear" : "Desbloquear"} Colaborador?</h3>
            <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "25px" }}>
              {usuarioEditando.ativo 
                ? `O usuário ${usuarioEditando.nome} perderá o acesso ao sistema imediatamente.`
                : `O acesso do usuário ${usuarioEditando.nome} será reativado agora.`}
            </p>
            {opError && <div style={{ ...errorBoxStyle, marginBottom: "15px" }}>{opError}</div>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setModalBloquearAberto(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#f1f5f9", fontWeight: "bold", cursor: "pointer" }}>Cancelar</button>
              <button onClick={toggleStatusUsuario} disabled={opLoading} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: usuarioEditando.ativo ? "#ef4444" : "#10b981", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                {opLoading ? "Processando..." : (usuarioEditando.ativo ? "Sim, Bloquear" : "Sim, Desbloquear")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERMISSÕES */}
      {modalPermissoesAberto && usuarioEditando && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: '#1e293b', display: "flex", alignItems: "center", gap: "8px" }}>
                <Key size={20} color="#2563eb" /> Acessos: {usuarioEditando.nome}
              </h3>
              <button onClick={() => setModalPermissoesAberto(false)} style={closeBtnStyle}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PERMISSOES_DISPONIVEIS.map(perm => {
                const has = permissoesAtuais.includes(perm.id);
                return (
                  <label key={perm.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px 15px', backgroundColor: has ? '#eff6ff' : '#f8fafc', borderRadius: '10px', border: `1px solid ${has ? '#3b82f6' : '#e2e8f0'}`, transition: "all 0.2s" }}>
                    <input type="checkbox" checked={has} onChange={() => togglePermissao(perm.id)} style={{ width: '18px', height: '18px', marginRight: '12px' }} />
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: has ? '700' : '500', color: has ? '#1e40af' : '#475569' }}>{perm.icon} {perm.nome}</span>
                  </label>
                );
              })}
            </div>
            <button onClick={salvarPermissoes} disabled={opLoading} style={{ ...submitBtnStyle, marginTop: "25px", width: "100%" }}>{opLoading ? <Loader2 size={18} className="spin-animation" /> : <Key size={18} />} Salvar Acessos</button>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {modalExcluirAberto && usuarioEditando && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: "400px", textAlign: "center" }}>
            <div style={{ backgroundColor: "#fef2f2", padding: "15px", borderRadius: "50%", width: "fit-content", margin: "0 auto 15px auto" }}><AlertTriangle size={32} color="#ef4444" /></div>
            <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>Excluir Colaborador?</h3>
            <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "25px" }}>Deseja remover <strong>{usuarioEditando.nome}</strong>? Esta ação não pode ser desfeita.</p>
            {opError && <div style={{ ...errorBoxStyle, marginBottom: "15px" }}>{opError}</div>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setModalExcluirAberto(false)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#f1f5f9", fontWeight: "bold", cursor: "pointer" }}>Cancelar</button>
              <button onClick={executeExcluir} disabled={opLoading} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#ef4444", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>{opLoading ? "Excluindo..." : "Sim, Excluir"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANUAL */}
      {showManual && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, animation: 'fadeIn 0.2s ease' }} onClick={() => setShowManual(false)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '90%', maxWidth: '650px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", color: "#1e293b" }}>
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Equipe e Acessos
              </h3>
              <button 
                onClick={() => setShowManual(false)} 
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", padding: "8px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}
              >
                <X size={22} />
              </button>
            </div>
            
            <div style={{ padding: "30px", overflowY: "auto", flexGrow: 1, maxHeight: "70vh" }}>
              <div style={{ color: "#475569", lineHeight: "1.6" }}>
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>Gerencie quem tem acesso ao sistema e quais permissões cada membro da equipe possui.</p>
                
                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>1</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Novo Colaborador:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Adicione membros novos escolhendo se serão Funcionários (acesso restrito) ou Administradores (acesso total).</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>2</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Bloquear / Desbloquear:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Clique no botão de cadeado para cortar o acesso de um funcionário imediatamente. O ícone fica vermelho (🔒) quando o usuário está bloqueado.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>3</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Permissões Específicas:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Para contas do tipo "Funcionário", clique no ícone da <strong>Chave</strong> para limitar quais telas ele pode ver (ex: bloquear relatórios ou financeiro).</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>4</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Resetar Senha:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Se alguém esquecer a senha, vá em "Editar" (lápis) e use o botão para resetar a senha usando os 6 primeiros dígitos do CPF.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background-color: #f8fafc !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: "fadeIn 0.2s ease" };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '550px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle: React.CSSProperties = { fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block', fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none', color: "#334155" };
const thStyle: React.CSSProperties = { padding: '16px', color: '#64748b', fontWeight: '700', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '16px' };
const iconBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: "#fff", cursor: 'pointer', transition: 'all 0.2s' };
const primaryBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' };
const submitBtnStyle: React.CSSProperties = { width: '100%', padding: '14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const closeBtnStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "5px" };
const errorBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", padding: "12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", marginBottom: "20px", fontSize: "0.9rem", fontWeight: "600" };

export default AdminTeamPage;