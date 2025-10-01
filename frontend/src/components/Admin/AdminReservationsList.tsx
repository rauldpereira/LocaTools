import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface Order {
    id: number;
    status: string;
}

const AdminReservationsList: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        const fetchAllOrders = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get('http://localhost:3001/api/reservations/all', config);
                setOrders(data);
            } catch (error) {
                console.error("Erro ao buscar todas as reservas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllOrders();
    }, [token]);

    const ordersForExitInspection = orders.filter(order => order.status === 'aprovada');
    
    
    const ordersForReturnInspection = orders.filter(order => order.status === 'em_andamento');

    if (loading) return <p>Carregando reservas...</p>;

    return (
        <div style={{ width: '100%' }}>
            <div>
                <h3>Reservas Aguardando Vistoria de Saída</h3>
                {ordersForExitInspection.length === 0 ? (
                    <p>Nenhuma reserva nesta etapa.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Pedido ID</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersForExitInspection.map(order => (
                                <tr key={order.id}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>#{order.id}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', color: 'orange' }}>{order.status}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        <Link to={`/admin/vistoria/${order.id}`}>
                                            <button>Realizar Vistoria de Saída</button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <hr style={{ margin: '3rem 0' }} />

            <div>
                <h3>Equipamentos em Locação (Aguardando Devolução)</h3>
                {ordersForReturnInspection.length === 0 ? <p>Nenhum equipamento em locação no momento.</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Pedido ID</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersForReturnInspection.map(order => (
                                <tr key={order.id}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>#{order.id}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', color: 'blue' }}>{order.status}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        
                                        <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}>
                                            <button>Registrar Vistoria de Devolução</button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminReservationsList;