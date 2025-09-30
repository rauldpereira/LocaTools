import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Unit {
    id: number;
    Equipamento: {
        nome: string;
    };
}
interface ReservedItem {
    id: number;
    Unidade: Unit;
}
interface OrderDetails {
    id: number;
    ItemReservas: ReservedItem[];
}

interface VistoriaDetailState {
    condicao: string;
    comentarios: string;
    fotos: File[];
}

const VistoriaPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [vistoriaDetails, setVistoriaDetails] = useState<{ [key: number]: Partial<VistoriaDetailState> }>({});

    const handleFileChange = (unitId: number, files: FileList | null) => {
        if (!files) return;
        setVistoriaDetails(prev => ({
            ...prev,
            [unitId]: {
                ...prev[unitId],
                fotos: Array.from(files)
            }
        }));
    };

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
        setVistoriaDetails(prev => ({
            ...prev,
            [unitId]: {
                ...prev[unitId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async () => {
        if (!order) return;

        const detalhesPayload = order.ItemReservas.map(item => ({
            id_unidade: item.Unidade.id,
            condicao: vistoriaDetails[item.Unidade.id]?.condicao || 'ok',
            comentarios: vistoriaDetails[item.Unidade.id]?.comentarios || '',
        }));
        
        const payload = {
            id_ordem_servico: parseInt(orderId!),
            tipo_vistoria: 'entrega', 
            detalhes: JSON.stringify(detalhesPayload)
        };

        const formData = new FormData();
        formData.append('id_ordem_servico', payload.id_ordem_servico.toString());
        formData.append('tipo_vistoria', payload.tipo_vistoria);
        formData.append('detalhes', payload.detalhes);

        order.ItemReservas.forEach(item => {
            const unitId = item.Unidade.id;
            const fotosDaUnidade = vistoriaDetails[unitId]?.fotos;
            if (fotosDaUnidade) {
                fotosDaUnidade.forEach(file => {
                    formData.append(`fotos[${unitId}]`, file);
                });
            }
        });

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post('http://localhost:3001/api/vistorias', formData, config);
            alert('Vistoria de saída registrada com sucesso!');
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao salvar vistoria:", error);
            alert('Falha ao salvar a vistoria.');
        }
    };

    if (!order) return <p>Carregando dados da ordem...</p>;

    return (
        <div style={{ padding: '2rem', marginTop: '60px' }}>
            <h1>Vistoria de Saída - Pedido #{order.id}</h1>
            {order.ItemReservas.map(item => (
                <div key={item.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <h3>{item.Unidade.Equipamento.nome} (Unidade ID: {item.Unidade.id})</h3>
                    <div>
                        <label>Condição: </label>
                        <select
                            value={vistoriaDetails[item.Unidade.id]?.condicao || 'ok'}
                            onChange={e => handleDetailChange(item.Unidade.id, 'condicao', e.target.value)}
                        >
                            <option value="ok">OK</option>
                            <option value="danificado">Danificado</option>
                        </select>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                        <label>Comentários:</label>
                        <textarea
                            style={{ width: '100%', minHeight: '60px' }}
                            value={vistoriaDetails[item.Unidade.id]?.comentarios || ''}
                            onChange={e => handleDetailChange(item.Unidade.id, 'comentarios', e.target.value)}
                        />
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                        <label>URLs das Fotos (separadas por vírgula):</label>
                        <input
                            type="file"
                            multiple
                            accept="image/*" 
                            style={{ width: '100%' }}
                            onChange={e => handleFileChange(item.Unidade.id, e.target.files)}
                        />
                    </div>
                </div>
            ))}
            <button onClick={handleSubmit} style={{ width: '100%', padding: '1rem', fontSize: '1.2rem' }}>
                Salvar Vistoria de Saída
            </button>
        </div>
    );
};

export default VistoriaPage;