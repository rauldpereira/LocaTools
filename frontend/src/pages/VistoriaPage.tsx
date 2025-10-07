import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Equipamento { nome: string; }
interface Unit { id: number; Equipamento: Equipamento; }
interface ReservedItem { id: number; Unidade: Unit; }
interface DetalheVistoriaSaida { condicao: string; comentarios: string; foto: string[] | null; id_item_equipamento: number; }
interface VistoriaSaida { detalhes: DetalheVistoriaSaida[]; tipo_vistoria: string; }
interface OrderDetails { id: number; ItemReservas: ReservedItem[]; Vistorias: VistoriaSaida[]; }
interface VistoriaDetailState { condicao: string; comentarios: string; fotos: File[]; }

const VistoriaPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [vistoriaDetails, setVistoriaDetails] = useState<{ [key: number]: Partial<VistoriaDetailState> }>({});
    const [loading, setLoading] = useState(false);

    const params = new URLSearchParams(location.search);
    const tipoVistoria = params.get('tipo') === 'devolucao' ? 'devolucao' : 'entrega';
    
    const vistoriaDeSaida = order?.Vistorias.find(v => v.tipo_vistoria === 'entrega');

    useEffect(() => {
        const fetchOrder = async () => {
            if (!token || !orderId) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);
            } catch (error) {
                console.error("Erro ao buscar ordem para vistoria:", error);
            }
        };
        fetchOrder();
    }, [orderId, token]);

    const handleDetailChange = (unitId: number, field: keyof VistoriaDetailState, value: string) => {
        setVistoriaDetails(prev => ({ ...prev, [unitId]: { ...prev[unitId], [field]: value } }));
    };
    const handleFileChange = (unitId: number, files: FileList | null) => {
        if (!files) return;
        setVistoriaDetails(prev => ({ ...prev, [unitId]: { ...prev[unitId], fotos: Array.from(files) } }));
    };

    const handleSubmit = async () => {
        if (!order) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('id_ordem_servico', order.id.toString());
        formData.append('tipo_vistoria', tipoVistoria);

        const detalhesParaJson = order.ItemReservas.map(item => ({
            id_unidade: item.Unidade.id,
            condicao: vistoriaDetails[item.Unidade.id]?.condicao || 'ok',
            comentarios: vistoriaDetails[item.Unidade.id]?.comentarios || '',
        }));
        formData.append('detalhes', JSON.stringify(detalhesParaJson));

        order.ItemReservas.forEach(item => {
            const fotosDaUnidade = vistoriaDetails[item.Unidade.id]?.fotos;
            if (fotosDaUnidade) {
                fotosDaUnidade.forEach(file => {
                    formData.append(`fotos[${item.Unidade.id}]`, file);
                });
            }
        });

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post('http://localhost:3001/api/vistorias', formData, config);
            alert(`Vistoria de ${tipoVistoria === 'entrega' ? 'Saída' : 'Devolução'} registrada com sucesso!`);
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao salvar vistoria:", error);
            alert('Falha ao salvar a vistoria.');
        } finally {
            setLoading(false);
        }
    };

    if (!order) return <p>A carregar dados da ordem...</p>;

    return (
        <div style={{ padding: '2rem', marginTop: '60px' }}>
            <h1>{tipoVistoria === 'entrega' ? 'Vistoria de Saída' : 'Vistoria de Devolução'} - Pedido #{order.id}</h1>
            {order.ItemReservas.map(item => {
                const detalheVistoriaSaida = vistoriaDeSaida?.detalhes.find(d => d.id_item_equipamento === item.Unidade.id);
                return (
                    <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                        <h3>{item.Unidade.Equipamento.nome} (Unidade ID: {item.Unidade.id})</h3>
                        
                        {tipoVistoria === 'devolucao' && detalheVistoriaSaida && (
                            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', marginBottom: '1rem', color: '#555' }}>
                                <h4>Dados da Vistoria de Saída (para comparação)</h4>
                                <p><strong>Condição na Saída:</strong> {detalheVistoriaSaida.condicao}</p>
                                <p><strong>Comentários na Saída:</strong> {detalheVistoriaSaida.comentarios || 'N/A'}</p>

                            </div>
                        )}
                        
                        <h4>Registar Condição de {tipoVistoria === 'entrega' ? 'Saída' : 'Devolução'}</h4>
                        <div>
                            <label>Condição: </label>
                            <select
                                value={vistoriaDetails[item.Unidade.id]?.condicao || 'ok'}
                                onChange={e => handleDetailChange(item.Unidade.id, 'condicao', e.target.value)} >
                                <option value="ok">OK</option>
                                <option value="danificado">Danificado</option>
                            </select>
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <label>Comentários:</label>
                            <textarea
                                style={{ width: '100%', minHeight: '60px' }}
                                value={vistoriaDetails[item.Unidade.id]?.comentarios || ''}
                                onChange={e => handleDetailChange(item.Unidade.id, 'comentarios', e.target.value)} />
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <label>Fotos da {tipoVistoria === 'entrega' ? 'Saída' : 'Devolução'}:</label>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                style={{ width: '100%' }}
                                onChange={e => handleFileChange(item.Unidade.id, e.target.files)} />
                        </div>
                    </div>
                );
            })}
            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '1rem', fontSize: '1.2rem' }}>
                {loading ? 'A Guardar...' : `Guardar Vistoria de ${tipoVistoria === 'entrega' ? 'Saída' : 'Devolução'}`}
            </button>
        </div>
    );
};

export default VistoriaPage;