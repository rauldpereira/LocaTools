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

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('id_desc'); 

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

    const processedOrders = orders
        .filter(order => {
            const search = searchTerm.toLowerCase();
            const idMatch = order.id.toString().includes(search);
            const dateMatch = parseDateStringAsLocal(order.data_inicio).toLocaleDateString().includes(search);
            return idMatch || dateMatch;
        })
        .sort((a, b) => {
            if (sortBy === 'id_desc') return b.id - a.id;
            if (sortBy === 'id_asc') return a.id - b.id;
            
            const dateA = new Date(a.data_inicio).getTime();
            const dateB = new Date(b.data_inicio).getTime();
            
            if (sortBy === 'date_asc') return dateA - dateB;
            if (sortBy === 'date_desc') return dateB - dateA;
            
            return 0;
        });


    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Carregando suas reservas...</div>;

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '80px auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h1 style={{ margin: 0 }}>Minhas Reservas</h1>
                
                {/* BARRA DE CONTROLES */}
                {orders.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar por ID ou Data..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '200px' }}
                        />
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
                        >
                            <option value="date_asc">Data da Locação Crescente</option>
                            <option value="date_desc">Data da Locação Decrescente</option>
                            <option value="id_desc">Pedidos Mais Recentes</option>
                            <option value="id_asc">Pedidos Mais Antigos</option>
                        </select>
                    </div>
                )}
            </div>

            {message && <p style={{ padding: '1rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', color: '#333', borderRadius: '4px' }}>{message}</p>}
            
            {orders.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}>
                    <p style={{ fontSize: '1.2rem', color: '#666' }}>Você ainda não fez nenhuma reserva.</p>
                    <Link to="/" style={{ display: 'inline-block', marginTop: '10px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                        🚜 Alugar Equipamentos
                    </Link>
                </div>
            ) : processedOrders.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>Nenhuma reserva encontrada para a sua busca.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {processedOrders.map(order => (
                        <li key={order.id} style={{ border: '1px solid #ddd', padding: '1.5rem', marginBottom: '1rem', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                            <Link to={`/my-reservations/${order.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0, color: '#333' }}>Pedido #{order.id}</h3>
                                    <span style={{ ...getStatusStyle(order.status), backgroundColor: '#f8f9fa', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                        {order.status.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '0.95rem' }}>
                                    <div>
                                        <p style={{ margin: '5px 0' }}><strong>Saída:</strong> {parseDateStringAsLocal(order.data_inicio).toLocaleDateString()}</p>
                                        <p style={{ margin: '5px 0' }}><strong>Retorno:</strong> {parseDateStringAsLocal(order.data_fim).toLocaleDateString()}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: '5px 0', fontSize: '1.1rem', color: '#2c3e50' }}><strong>R$ {Number(order.valor_total).toFixed(2)}</strong></p>
                                    </div>
                                </div>
                            </Link>

                            {order.status === 'cancelada' && (
                                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc', backgroundColor: '#fafafa', padding: '10px', borderRadius: '4px' }}>
                                    {Number(order.taxa_cancelamento) > 0 && (
                                        <p style={{ color: '#dc3545', margin: '5px 0' }}><strong>Taxa de Cancelamento:</strong> R$ {Number(order.taxa_cancelamento).toFixed(2)}</p>
                                    )}
                                    <p style={{ color: '#28a745', margin: '5px 0' }}><strong>Valor Reembolsado:</strong> R$ {Number(order.valor_reembolsado).toFixed(2)}</p>
                                </div>
                            )}

                            {cancellableStatuses.includes(order.status) && (
                                <button
                                    onClick={(e) => handleCancelOrder(order.id, e)}
                                    style={{ marginTop: '15px', width: '100%', backgroundColor: '#fff', color: '#dc3545', border: '1px solid #dc3545', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc3545'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#dc3545'; }}
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