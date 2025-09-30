import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Equipamento {
    nome: string;
    url_imagem: string;
}
interface Unidade {
    id: number;
    Equipamento: Equipamento;
}
interface ItemReserva {
    id: number;
    Unidade: Unidade;
}
interface DetalheVistoria {
    id: number;
    id_item_equipamento: number;
    condicao: string;
    comentarios: string;
    foto: string | null;
}
interface Vistoria {
    id: number;
    tipo_vistoria: 'entrega' | 'devolucao';
    data: string;
    detalhes: DetalheVistoria[];
}
interface OrderDetails {
    id: number;
    status: string;
    ItemReservas: ItemReserva[];
    Vistorias: Vistoria[];
}

const ReservationDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const backendUrl = 'http://localhost:3001';

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!token || !orderId) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`${backendUrl}/api/reservations/${orderId}`, config);
                setOrder(data);
            } catch (error) {
                console.error("Erro ao buscar detalhes do pedido:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [orderId, token]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>A carregar detalhes do pedido...</div>;
    if (!order) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Pedido não encontrado.</div>;

    const vistoriaDeSaida = order.Vistorias.find(v => v.tipo_vistoria === 'entrega');

    const getVistoriaDetailForItem = (unitId: number) => {
        if (!vistoriaDeSaida) return null;
        return vistoriaDeSaida.detalhes.find(d => d.id_item_equipamento === unitId);
    };

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '80px auto' }}>
            <h1>Detalhes do Pedido #{order.id}</h1>
            <p style={{ fontSize: '1.2rem' }}><strong>Estado do seu pedido:</strong> <span style={{ fontWeight: 'bold' }}>{order.status.replace('_', ' ')}</span></p>

            <hr style={{ margin: '2rem 0' }} />

            <h2>Itens Alugados e Vistoria de Saída</h2>
            {order.ItemReservas.map(item => {
                const vistoriaDetail = getVistoriaDetailForItem(item.Unidade.id);
                return (
                    <div key={item.id} style={{ border: '1px solid #ddd', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '8px' }}>
                        <h3>{item.Unidade.Equipamento.nome} (Unidade #{item.Unidade.id})</h3>
                        
                        {vistoriaDeSaida ? (
                            vistoriaDetail ? (
                                <div style={{ marginTop: '1rem' }}>
                                    <h4>Relatório da Vistoria de Saída</h4>
                                    <p><strong>Condição:</strong> {vistoriaDetail.condicao}</p>
                                    <p><strong>Comentários:</strong> {vistoriaDetail.comentarios || 'Nenhum comentário.'}</p>
                                    {vistoriaDetail.foto ? (
                                        <div>
                                            <strong>Foto:</strong><br />
                                            <a href={`${backendUrl}${vistoriaDetail.foto}`} target="_blank" rel="noopener noreferrer">
                                                <img 
                                                  src={`${backendUrl}${vistoriaDetail.foto}`} 
                                                  alt={`Foto da vistoria da unidade ${item.Unidade.id}`} 
                                                  style={{ maxWidth: '300px', marginTop: '10px', borderRadius: '5px' }} 
                                                />
                                            </a>
                                        </div>
                                    ) : <p><strong>Foto:</strong> Nenhuma foto registada.</p>}
                                </div>
                            ) : (
                                <p>Detalhes da vistoria para este item específico não encontrados.</p>
                            )
                        ) : (
                            <p style={{ color: 'orange' }}>A aguardar vistoria de saída pela nossa equipa.</p>
                        )}
                    </div>
                )
            })}
        </div>
    );
};

export default ReservationDetailsPage;

