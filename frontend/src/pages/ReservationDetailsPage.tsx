import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface EquipmentItem {
    nome: string;
    url_imagem: string;
}

interface UnitItem {
    Equipamento: EquipmentItem;
}

interface ReservedItem {
    id: number;
    Unidade: UnitItem;
}

interface OrderDetails {
    id: number;
    status: string;
    data_inicio: string;
    data_fim: string;
    valor_total: string;
    valor_sinal: string;
    tipo_entrega: string;
    endereco_entrega?: string;
    custo_frete: string;
    ItemReservas: ReservedItem[];
}

const ReservationDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId || !token) {
            setLoading(false);
            return;
        }

        const fetchOrderDetails = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
    
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);
            } catch (error) {
                console.error("Erro ao buscar detalhes da reserva:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [orderId, token]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Carregando detalhes...</div>;
    if (!order) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Reserva não encontrada.</div>;

    const subtotal = Number(order.valor_total) - Number(order.custo_frete);

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '80px auto' }}>
            <button onClick={() => navigate('/my-reservations')} style={{ marginBottom: '1rem' }}>&larr; Voltar para Minhas Reservas</button>
            <h1>Detalhes do Pedido #{order.id}</h1>
            
            <div style={{ border: '1px solid #ddd', padding: '1.5rem', borderRadius: '8px' }}>
                <h3>Informações Gerais</h3>
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Período:</strong> {new Date(order.data_inicio).toLocaleDateString()} a {new Date(order.data_fim).toLocaleDateString()}</p>
                
                <hr style={{ margin: '1rem 0' }}/>
                
                <h3>Detalhes Financeiros</h3>
                <p>Subtotal dos Itens: R$ {subtotal.toFixed(2)}</p>
                <p>Custo do Frete: R$ {Number(order.custo_frete).toFixed(2)}</p>
                <p><strong>Valor Total:</strong> R$ {Number(order.valor_total).toFixed(2)}</p>
                <p><strong>Sinal Pago (50%):</strong> R$ {Number(order.valor_sinal).toFixed(2)}</p>

                <hr style={{ margin: '1rem 0' }}/>

                <h3>Entrega</h3>
                <p><strong>Tipo:</strong> {order.tipo_entrega === 'entrega' ? 'Entrega em domicílio' : 'Retirada na loja'}</p>
                {order.tipo_entrega === 'entrega' && <p><strong>Endereço:</strong> {order.endereco_entrega}</p>}
                
                <hr style={{ margin: '1rem 0' }}/>

                <h3>Itens Alugados</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {order.ItemReservas.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                            <img src={item.Unidade.Equipamento.url_imagem} alt={item.Unidade.Equipamento.nome} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }}/>
                            <span>{item.Unidade.Equipamento.nome}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailsPage;