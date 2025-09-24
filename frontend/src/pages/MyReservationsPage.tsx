import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface Order {
    id: number;
    status: 'pendente' | 'aprovada' | 'cancelada' | 'finalizada';
    data_inicio: string;
    data_fim: string;
    valor_total: string;
}

const MyReservationsPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        const fetchOrders = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get('http://localhost:3001/api/reservations/my', config);
                setOrders(data);
            } catch (error) {
                console.error("Erro ao buscar as reservas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [token]);

    const getStatusStyle = (status: Order['status']) => {
        switch (status) {
            case 'aprovada': return { color: 'green', fontWeight: 'bold' };
            case 'pendente': return { color: 'orange', fontWeight: 'bold' };
            case 'cancelada': return { color: 'red', fontWeight: 'bold' };
            default: return { color: 'grey' };
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Carregando suas reservas...</div>;

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '80px auto' }}>
            <h1>Minhas Reservas</h1>
            {orders.length === 0 ? (
                <p>Você ainda não fez nenhuma reserva. <a href="/">Alugue um item agora!</a></p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {orders.map(order => (
                        <Link key={order.id} to={`/my-reservations/${order.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <li style={{ border: '1px solid #ddd', padding: '1rem 1.5rem', marginBottom: '1rem', borderRadius: '8px', cursor: 'pointer' }}>
                                <h3>Pedido #{order.id}</h3>
                                <p><strong>Status:</strong> <span style={getStatusStyle(order.status)}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></p>
                                <p><strong>Período:</strong> {new Date(order.data_inicio).toLocaleDateString()} - {new Date(order.data_fim).toLocaleDateString()}</p>
                                <p><strong>Valor Total:</strong> R$ {Number(order.valor_total).toFixed(2)}</p>
                            </li>
                        </Link>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MyReservationsPage;