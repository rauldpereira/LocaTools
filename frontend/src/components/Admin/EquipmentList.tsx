import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import EditEquipmentModal from '../EditEquipmentModal';
import StockManagerModal from '../StockManagerModal';
import { Edit, Package, Trash2, Search, RefreshCw, Layers, X, AlertTriangle } from 'lucide-react';

interface Category {
    id: number;
    nome: string;
}

interface Equipment {
    id: number;
    nome: string;
    descricao: string;
    preco_diaria: string;
    total_quantidade: number;
    url_imagem: string;
    Categoria?: Category;
    categoriaId?: number;
}

const EquipmentList: React.FC = () => {
    const { token } = useAuth();
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const [stockModalData, setStockModalData] = useState<{ id: number | null; nome: string }>({ id: null, nome: '' });
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [equipmentToDelete, setEquipmentToDelete] = useState<number | null>(null);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

    const fetchEquipments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/equipment`);
            setEquipments(response.data);
        } catch (error) {
            console.error('Erro ao buscar equipamentos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEquipments();
    }, []);

    const handleDelete = (id: number) => {
        setEquipmentToDelete(id);
        setDeleteErrorMessage(null);
    };

    const confirmDelete = async () => {
        if (!equipmentToDelete) return;
        setDeleteErrorMessage(null);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/equipment/${equipmentToDelete}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEquipmentToDelete(null);
            fetchEquipments();
        } catch (error: any) {
            setDeleteErrorMessage(error.response?.data?.error || 'Erro ao excluir o equipamento.');
        }
    };

    const processarImagemParaExibicao = (urlImagem: string | null) => {
        if (!urlImagem) return 'https://via.placeholder.com/150';
        try {
            const parsed = JSON.parse(urlImagem);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const firstImage = parsed[0];
              return firstImage.startsWith('http') ? firstImage : `${import.meta.env.VITE_API_URL}${firstImage}`;
            }
        } catch (e) {
            if (urlImagem.startsWith('http')) return urlImagem;
            return `${import.meta.env.VITE_API_URL}${urlImagem}`;
        }
        return 'https://via.placeholder.com/150';
    };

    const handleEditClick = (id: number) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    const filteredEquipments = equipments.filter(equip => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const nomeMatch = equip.nome.toLowerCase().includes(term);
      const catMatch = (equip.Categoria?.nome || "").toLowerCase().includes(term);
      return nomeMatch || catMatch;
    });

    const totalPages = Math.ceil(filteredEquipments.length / perPage);
    const currentData = filteredEquipments.slice((page - 1) * perPage, page * perPage);

    if (loading) return <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Carregando catálogo...</div>;

    return (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#f8fafc", padding: "8px 15px", borderRadius: "8px", border: "1px solid #e2e8f0", flex: "1 1 250px" }}>
                <Search size={18} color="#94a3b8" />
                <input 
                  type="text" 
                  placeholder="Buscar equipamento ou categoria..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  style={{ border: "none", backgroundColor: "transparent", outline: "none", width: "100%", fontSize: "0.9rem", color: "#334155" }}
                />
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Exibir:</span>
                  <select 
                    value={perPage} 
                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} 
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#475569", outline: "none", cursor: "pointer", backgroundColor: "#fff" }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <button onClick={fetchEquipments} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 15px", backgroundColor: "#f1f5f9", border: "none", borderRadius: "8px", color: "#2563eb", fontWeight: "bold", cursor: "pointer" }}>
                  <RefreshCw size={16} /> Atualizar
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto", backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px", fontSize: "0.9rem" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                            <th style={thStyle}>Imagem</th>
                            <th style={thStyle}>Nome</th>
                            <th style={thStyle}>Categoria</th>
                            <th style={thStyle}>Preço Diária</th>
                            <th style={thStyle}>Estoque Total</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((equip) => (
                            <tr key={equip.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} className="table-row-hover">
                                <td style={tdStyle}>
                                    <img
                                        src={processarImagemParaExibicao(equip.url_imagem)}
                                        alt={equip.nome}
                                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                </td>
                                <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>{equip.nome}</td>
                                <td style={tdStyle}>
                                    <span style={{ backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', color: '#475569', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Layers size={12} />
                                        {equip.Categoria?.nome || 'Geral'}
                                    </span>
                                </td>
                                <td style={{ ...tdStyle, color: '#10b981', fontWeight: '600' }}>
                                    R$ {Number(equip.preco_diaria).toFixed(2)}
                                </td>
                                <td style={tdStyle}>
                                    <span style={{ fontWeight: '600', color: '#64748b' }}>{equip.total_quantidade} un.</span>
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => handleEditClick(equip.id)}
                                            style={editBtnStyle}
                                            title="Editar Equipamento"
                                        >
                                            <Edit size={16} />
                                        </button>

                                        <button
                                            onClick={() => {
                                                setStockModalData({ id: equip.id, nome: equip.nome });
                                                setIsStockModalOpen(true);
                                            }}
                                            title="Gerenciar Estoque"
                                            style={{ ...editBtnStyle, color: '#0ea5e9' }}
                                        >
                                            <Package size={16} />
                                        </button>

                                        <button onClick={() => handleDelete(equip.id)} style={deleteBtnStyle} title="Excluir Equipamento">
                                          <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {currentData.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Nenhum equipamento encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "25px" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      padding: "8px 14px", borderRadius: "6px", border: "1px solid", borderColor: page === n ? "#2563eb" : "#e2e8f0", backgroundColor: page === n ? "#2563eb" : "#fff", color: page === n ? "#fff" : "#64748b", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            <EditEquipmentModal
                isOpen={isModalOpen}
                equipmentId={selectedId}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    fetchEquipments();
                }}
            />
            <StockManagerModal
                isOpen={isStockModalOpen}
                equipmentId={stockModalData.id}
                equipmentName={stockModalData.nome}
                onClose={() => {
                    setIsStockModalOpen(false);
                    fetchEquipments();
                }}
            />

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {equipmentToDelete !== null && (
              <div style={overlayStyle} onClick={() => setEquipmentToDelete(null)}>
                <div style={{ ...modalStyle, width: '450px', border: "2px solid #ef4444" }} onClick={e => e.stopPropagation()}>
                  <div style={{ ...headerStyle, backgroundColor: "#fef2f2", borderBottom: "1px solid #fee2e2" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ backgroundColor: "#fee2e2", padding: "10px", borderRadius: "10px" }}>
                          <AlertTriangle size={28} color="#ef4444" />
                      </div>
                      <div>
                          <h2 style={{ margin: 0, color: '#991b1b', fontSize: "1.25rem" }}>Confirmar Exclusão</h2>
                      </div>
                    </div>
                    <button onClick={() => setEquipmentToDelete(null)} style={closeBtnStyle}><X size={24} /></button>
                  </div>
                  <div style={{ padding: "25px" }}>
                    {deleteErrorMessage ? (
                        <div style={{ margin: "0 0 15px 0", color: "#b91c1c", backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "600", animation: "fadeIn 0.3s ease" }}>
                            {deleteErrorMessage}
                        </div>
                    ) : (
                        <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem", lineHeight: "1.5" }}>
                        Tem certeza que deseja excluir permanentemente o <strong>Equipamento #{equipmentToDelete}</strong> do catálogo?
                        <br /><br />
                        <span style={{ color: "#ef4444", fontWeight: "600" }}>Atenção:</span> Esta ação apagará todas as unidades associadas a ele, desde que nenhuma tenha histórico de locação.
                        </p>
                    )}
                  </div>
                  <div style={{ padding: "20px 25px", borderTop: "1px solid #f1f5f9", display: "flex", gap: "12px" }}>
                    <button onClick={() => setEquipmentToDelete(null)} style={btnSecondaryStyle}>Cancelar</button>
                    <button onClick={confirmDelete} disabled={!!deleteErrorMessage} style={{ ...btnPrimaryStyle, backgroundColor: "#ef4444", opacity: deleteErrorMessage ? 0.5 : 1, cursor: deleteErrorMessage ? 'not-allowed' : 'pointer' }}>
                      <Trash2 size={18} />
                      Excluir Equipamento
                    </button>
                  </div>
                </div>
              </div>
            )}

            <style>{`
              .table-row-hover:hover { background-color: #f8fafc !important; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: "fadeIn 0.2s ease" };
const modalStyle: React.CSSProperties = { backgroundColor: 'white', borderRadius: '20px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: "hidden", boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: "25px", borderBottom: "1px solid #f1f5f9" };
const closeBtnStyle: React.CSSProperties = { background: '#f1f5f9', color: "#64748b", border: 'none', borderRadius: "50%", padding: "8px", cursor: 'pointer', display: "flex", alignItems: "center", transition: "0.2s" };
const btnPrimaryStyle: React.CSSProperties = { padding: "12px 20px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" };
const btnSecondaryStyle: React.CSSProperties = { padding: "12px 20px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };

const thStyle: React.CSSProperties = { padding: '16px', color: '#64748b', fontWeight: '700', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '16px' };
const editBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' };
const deleteBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' };

export default EquipmentList;