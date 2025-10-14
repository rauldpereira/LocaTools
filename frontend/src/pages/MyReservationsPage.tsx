import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { parseDateStringAsLocal } from '../utils/dateUtils';

interface Order {
    id: number;
    status: 'pendente' | 'aprovada' | 'cancelada' | 'finalizada' | 'aguardando_assinatura' | 'em_andamento';
    data_inicio: string;
    data_fim: string;
    valor_total: string;
    taxa_cancelamento?: string;
    valor_reembolsado?: string;
}

const MyReservationsPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const [message, setMessage] = useState('');

    const cancellableStatuses = ['aprovada', 'aguardando_assinatura'];

    const fetchOrders = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get('http://localhost:3001/api/reservations/my', config);
            setOrders(data);
        } catch (error) {
            console.error("Erro ao buscar as reservas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [token]);

    const handleCancelOrder = async (orderId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm("Você tem certeza que deseja cancelar esta reserva? Pode haver taxas de cancelamento dependendo da data.")) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.put(`http://localhost:3001/api/reservations/${orderId}/cancel`, {}, config);
            setMessage(data.message || 'Reserva cancelada com sucesso!');
            fetchOrders();
        } catch (error: any) {
            setMessage(error.response?.data?.error || 'Não foi possível cancelar a reserva.');
            console.error("Erro ao cancelar reserva:", error);
        }
    };

    const getStatusStyle = (status: Order['status']) => {
        switch (status) {
            case 'aprovada':
            case 'em_andamento':
                return { color: 'green', fontWeight: 'bold' };
            case 'pendente':
            case 'aguardando_assinatura':
                return { color: 'orange', fontWeight: 'bold' };
            case 'cancelada':
                return { color: 'red', fontWeight: 'bold' };
            default:
                return { color: 'grey' };
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Carregando suas reservas...</div>;

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '80px auto' }}>
            <h1>Minhas Reservas</h1>
            {message && <p style={{ padding: '1rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', color: '#333' }}>{message}</p>}
            {orders.length === 0 ? (
                <p>Você ainda não fez nenhuma reserva. <Link to="/">Alugue um item agora!</Link></p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {orders.map(order => (
                        <li key={order.id} style={{ border: '1px solid #ddd', padding: '1rem 1.5rem', marginBottom: '1rem', borderRadius: '8px' }}>
                            <Link to={`/my-reservations/${order.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <h3>Pedido #{order.id}</h3>
                                <p><strong>Status:</strong> <span style={getStatusStyle(order.status)}>{order.status.replace(/_/g, ' ')}</span></p>
                                <p><strong>Período:</strong> {parseDateStringAsLocal(order.data_inicio).toLocaleDateString()} - {parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</p>
                                <p><strong>Valor Total:</strong> R$ {Number(order.valor_total).toFixed(2)}</p>
                            </Link>

                            {order.status === 'cancelada' && (
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ccc' }}>
                                    {Number(order.taxa_cancelamento) > 0 && (
                                        <p style={{ color: 'red' }}><strong>Taxa de Cancelamento:</strong> R$ {Number(order.taxa_cancelamento).toFixed(2)}</p>
                                    )}
                                    <p style={{ color: 'green' }}><strong>Valor Reembolsado:</strong> R$ {Number(order.valor_reembolsado).toFixed(2)}</p>
                                </div>
                            )}

                            {cancellableStatuses.includes(order.status) && (
                                <button
                                    onClick={(e) => handleCancelOrder(order.id, e)}
                                    style={{ marginTop: '1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}
                                >
                                    Cancelar Reserva
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MyReservationsPage;