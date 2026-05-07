import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Layers, Plus, Trash2, FolderPlus, CheckCircle, AlertTriangle, X, Edit2, Save, Loader2, HelpCircle } from 'lucide-react';

interface Category {
  id: number;
  nome: string; 
}

const AddCategoryForm: React.FC = () => {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  
  const [showManual, setShowManual] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao buscar categorias', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${import.meta.env.VITE_API_URL}/api/categories`, {
        nome: name 
      }, config);
      
      setSuccessMsg('Categoria criada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      setName('');
      fetchCategories();
    } catch (error) {
      alert('Erro ao criar categoria.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    setCategoryToDelete(id);
    setDeleteErrorMsg('');
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!categoryToDelete) return;
    setDeleteErrorMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/categories/${categoryToDelete}`, config);
      fetchCategories();
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    } catch (error: any) {
      if (error.response?.status === 400) {
        setDeleteErrorMsg('Não é possível excluir esta categoria porque existem equipamentos vinculados a ela.');
      } else {
        setDeleteErrorMsg('Erro ao excluir categoria.');
      }
    }
  };

  const openEditModal = (cat: Category) => {
    setCategoryToEdit(cat);
    setEditName(cat.nome);
    setEditModalOpen(true);
    setEditSuccessMsg('');
    setEditLoading(false);
  };

  const executeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToEdit || !editName.trim()) return;
    setEditLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${import.meta.env.VITE_API_URL}/api/categories/${categoryToEdit.id}`, { nome: editName }, config);
      setEditSuccessMsg('Categoria atualizada com sucesso!');
      fetchCategories();
      setTimeout(() => {
        setEditSuccessMsg('');
        setEditModalOpen(false);
        setCategoryToEdit(null);
        setEditLoading(false);
      }, 2000);
    } catch (error) {
      alert('Erro ao atualizar categoria.');
      setEditLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", width: "100%", position: "relative" }}>
      {/* HEADER E FORMULÁRIO DE CRIAÇÃO */}
      <div style={{ marginBottom: "30px", padding: "25px", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <FolderPlus size={20} color="#2563eb" /> 
            Categorias de Equipamentos
          </h3>
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
        
        {successMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", backgroundColor: "#ecfdf5", border: "1px solid #10b981", borderRadius: "8px", color: "#047857", marginBottom: "20px", fontWeight: "bold" }}>
            <CheckCircle size={18} color="#10b981" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nome da Categoria</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Ferramentas Elétricas"
              style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", color: "#334155", outline: "none", boxSizing: "border-box" }}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", 
              backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", 
              fontSize: "1rem", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", 
              transition: "background-color 0.2s", height: "46px"
            }}
          >
            {loading ? <Loader2 size={18} className="spin-animation" /> : <Plus size={18} />}
            {loading ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {/* LISTA DE CATEGORIAS */}
      <div style={{ backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "30px" }}>
        
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Layers size={20} color="#64748b" />
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.15rem" }}>Categorias Cadastradas <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "normal" }}>({categories.length})</span></h3>
        </div>

        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Nome da Categoria</th>
                <th style={{...thStyle, textAlign: 'center'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9', transition: "background 0.2s" }} className="table-row-hover">
                  <td style={{ ...tdStyle, color: "#64748b", fontWeight: "600" }}>#{cat.id}</td>
                  <td style={{ ...tdStyle, fontWeight: '700', color: '#1e293b' }}>{cat.nome}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => openEditModal(cat)} 
                        title="Editar Categoria"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s" }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => confirmDelete(cat.id)} 
                        title="Excluir Categoria"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", border: "1px solid #fecaca", backgroundColor: "#fef2f2", color: "#ef4444", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Nenhuma categoria encontrada no sistema.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "30px", maxWidth: "450px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", position: "relative" }}>
            <button 
              onClick={() => setEditModalOpen(false)}
              style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
            >
              <X size={20} />
            </button>
            <h3 style={{ margin: "0 0 20px 0", color: "#1e293b", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Edit2 size={20} color="#2563eb" /> Editar Categoria
            </h3>
            
            {editSuccessMsg && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", backgroundColor: "#ecfdf5", border: "1px solid #10b981", borderRadius: "8px", color: "#047857", marginBottom: "20px", fontWeight: "bold", animation: "fadeIn 0.3s ease" }}>
                <CheckCircle size={18} color="#10b981" />
                {editSuccessMsg}
              </div>
            )}

            <form onSubmit={executeEdit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "8px" }}>Nome da Categoria</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  disabled={editLoading && !editSuccessMsg}
                  style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem", color: "#334155", outline: "none", boxSizing: "border-box", opacity: (editLoading && !editSuccessMsg) ? 0.6 : 1 }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <button 
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editLoading && !editSuccessMsg}
                  style={{ flex: 1, padding: "12px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: (editLoading && !editSuccessMsg) ? "not-allowed" : "pointer", opacity: (editLoading && !editSuccessMsg) ? 0.6 : 1 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={editLoading}
                  style={{ flex: 1, padding: "12px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: editLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  {editLoading && !editSuccessMsg ? <Loader2 size={18} className="spin-animation" /> : <Save size={18} />}
                  {editLoading && !editSuccessMsg ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {deleteModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "30px", maxWidth: "400px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", position: "relative" }}>
            <button 
              onClick={() => setDeleteModalOpen(false)}
              style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
            >
              <X size={20} />
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ backgroundColor: "#fef2f2", padding: "15px", borderRadius: "50%", marginBottom: "15px" }}>
                <AlertTriangle size={32} color="#ef4444" />
              </div>
              <h3 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "1.25rem" }}>Confirmar Exclusão</h3>
              
              {deleteErrorMsg ? (
                <div style={{ margin: "0 0 25px 0", color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "600", width: "100%", animation: "fadeIn 0.3s ease" }}>
                  {deleteErrorMsg}
                </div>
              ) : (
                <p style={{ margin: "0 0 25px 0", color: "#64748b", fontSize: "0.95rem", lineHeight: "1.5" }}>
                  Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  style={{ flex: 1, padding: "12px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeDelete}
                  disabled={!!deleteErrorMsg}
                  style={{ flex: 1, padding: "12px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: deleteErrorMsg ? "not-allowed" : "pointer", opacity: deleteErrorMsg ? 0.5 : 1 }}
                >
                  Excluir
                </button>
              </div>
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
                <HelpCircle size={22} color="#2563eb" /> Manual do Usuário: Categorias
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
                <p style={{ marginBottom: "25px", fontSize: "1rem" }}>Organize seu catálogo agrupando os equipamentos por categorias.</p>
                
                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>1</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Criar Categoria:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Digite o nome da nova categoria (ex: "Ferramentas Elétricas") e clique em Adicionar. Ela aparecerá na lista abaixo.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>2</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Editar Categoria:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Use o ícone de lápis para corrigir erros de digitação. As alterações serão refletidas em todos os equipamentos dessa categoria.</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "15px", padding: "15px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem", flexShrink: 0 }}>3</div>
                  <div>
                    <strong style={{ color: "#1e293b" }}>Excluir Categoria:</strong>
                    <p style={{ margin: "5px 0 0 0" }}>Você só pode excluir uma categoria se ela estiver <strong style={{ color: "#ef4444" }}>VAZIA</strong> (sem nenhum equipamento vinculado). Caso contrário, o sistema bloqueará a exclusão para evitar erros.</p>
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

const thStyle: React.CSSProperties = { padding: '16px', color: '#64748b', fontWeight: '700', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '16px' };

export default AddCategoryForm;