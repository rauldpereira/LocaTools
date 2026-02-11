import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import EditEquipmentModal from '../EditEquipmentModal';
import StockManagerModal from '../StockManagerModal';

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
    
    const fetchEquipments = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/equipment');
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
            await axios.delete(`http://localhost:3001/api/equipment/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Equipamento excluído!');
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
                return `http://localhost:3001${parsed[0]}`;
            }
        } catch (e) {
            if (urlImagem.startsWith('http')) return urlImagem;
            return `http://localhost:3001${urlImagem}`;
        }

        return 'https://via.placeholder.com/150';
    };

    const handleEditClick = (id: number) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    if (loading) return <p>Carregando catálogo...</p>;

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#333' }}>Catálogo de Equipamentos</h3>
                <button onClick={fetchEquipments} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.9rem' }}>↻ Atualizar</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', color: '#555', fontSize: '0.9rem', textAlign: 'left' }}>
                        <th style={thStyle}>Imagem</th>
                        <th style={thStyle}>Nome</th>
                        <th style={thStyle}>Categoria</th>
                        <th style={thStyle}>Preço Diária</th>
                        <th style={thStyle}>Estoque Total</th>
                        <th style={thStyle}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {equipments.map((equip, index) => (
                        <tr key={equip.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                            <td style={tdStyle}>
                                <img
                                    src={processarImagemParaExibicao(equip.url_imagem)}
                                    alt={equip.nome}
                                    style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                                />
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 'bold', color: '#333' }}>{equip.nome}</td>
                            <td style={tdStyle}>
                                <span style={{ backgroundColor: '#eef2f7', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', color: '#444' }}>
                                    {equip.Categoria?.nome || 'Geral'}
                                </span>
                            </td>
                            <td style={{ ...tdStyle, color: '#28a745', fontWeight: 'bold' }}>
                                R$ {Number(equip.preco_diaria).toFixed(2)}
                            </td>
                            <td style={tdStyle}>
                                <span style={{ fontWeight: 'bold', color: '#666' }}>{equip.total_quantidade} un.</span>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                        onClick={() => handleEditClick(equip.id)}
                                        style={editBtnStyle}
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        onClick={() => {
                                            setStockModalData({ id: equip.id, nome: equip.nome });
                                            setIsStockModalOpen(true);
                                        }}
                                        title="Gerenciar Estoque"
                                        style={{ ...editBtnStyle, borderColor: '#17a2b8', color: '#17a2b8' }}
                                    >
                                        📦
                                    </button>

                                    <button onClick={() => handleDelete(equip.id)} style={deleteBtnStyle}>🗑️</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {equipments.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Nenhum equipamento cadastrado.</td>
                        </tr>
                    )}
                </tbody>
            </table>
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
        </div>
    );
};

const thStyle: React.CSSProperties = { padding: '15px', fontWeight: '600' };
const tdStyle: React.CSSProperties = { padding: '12px' };
const editBtnStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '4px', cursor: 'pointer' };
const deleteBtnStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #dc3545', backgroundColor: '#fff', color: '#dc3545', borderRadius: '4px', cursor: 'pointer' };

export default EquipmentList;