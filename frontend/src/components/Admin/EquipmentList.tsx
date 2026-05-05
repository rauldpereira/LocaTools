import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import EditEquipmentModal from '../EditEquipmentModal';
import StockManagerModal from '../StockManagerModal';
import { Edit, Package, Trash2, Search, RefreshCw, Layers } from 'lucide-react';

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

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/equipment/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEquipments();
        } catch (error) {
            alert('Erro ao excluir.');
        }
    };

    const processarImagemParaExibicao = (urlImagem: string | null) => {
        if (!urlImagem) return 'https://via.placeholder.com/150';
        try {
            const parsed = JSON.parse(urlImagem);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return `${import.meta.env.VITE_API_URL}${parsed[0]}`;
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
            <style>{`
              .table-row-hover:hover { background-color: #f8fafc !important; }
            `}</style>
        </div>
    );
};

const thStyle: React.CSSProperties = { padding: '16px', color: '#64748b', fontWeight: '700', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '16px' };
const editBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' };
const deleteBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' };

export default EquipmentList;