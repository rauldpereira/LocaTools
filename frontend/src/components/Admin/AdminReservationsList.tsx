import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface Order {
    id: number;
    status: string;
    data_inicio: string;
    data_fim: string;
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
    const ordersAwaitingSignature = orders.filter(order => order.status === 'aguardando_assinatura');
    const ordersForReturnInspection = orders.filter(order => order.status === 'em_andamento');
    const ordersAwaitingFinalPayment = orders.filter(order => order.status === 'aguardando_pagamento_final');
    const finalizedOrders = orders.filter(order => order.status === 'finalizada');
    const cancelledOrders = orders.filter(order => order.status === 'cancelada');

    if (loading) return <p>A carregar reservas...</p>;


    const renderOrderTable = (
        title: string,
        orderList: Order[],
        headers: { key: keyof Order, label: string }[],
        action: (order: Order) => React.ReactNode
    ) => (
        <div style={{ marginBottom: '2.5rem' }}>
            <h3>{title}</h3>
            {orderList.length === 0 ? (
                <p>Nenhuma reserva nesta etapa.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{header.label}</th>
                            ))}
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderList.map(order => (
                            <tr key={order.id}>
                                {headers.map(header => (
                                    <td key={header.key} style={{ border: '1px solid #ddd', padding: '8px' }}>

                                        {header.key.includes('data')
                                            ? new Date(order[header.key]).toLocaleDateString()
                                            : order[header.key]
                                        }
                                    </td>
                                ))}
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{action(order)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div style={{ width: '100%' }}>
            {renderOrderTable(
                "Reservas Aguardando Vistoria de Saída",
                ordersForExitInspection,
                [{ key: 'id', label: 'Pedido ID' }, { key: 'data_inicio', label: 'Data de Saída' }],
                order => <Link to={`/admin/vistoria/${order.id}`}><button>Realizar Vistoria</button></Link>
            )}

            {renderOrderTable(
                "Aguardando Assinatura do Contrato",
                ordersAwaitingSignature,
                [{ key: 'id', label: 'Pedido ID' }, { key: 'status', label: 'Status' }],
                order => <Link to={`/my-reservations/${order.id}`}><button>Ver Detalhes</button></Link>
            )}

            {renderOrderTable(
                "Equipamentos em Locação (Aguardando Devolução)",
                ordersForReturnInspection,
                [{ key: 'id', label: 'Pedido ID' }, { key: 'data_fim', label: 'Data de Devolução' }],
                order => <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}><button>Registar Devolução</button></Link>
            )}

            {renderOrderTable(
                "Reservas Aguardando Pagamento Final",
                ordersAwaitingFinalPayment,
                [{ key: 'id', label: 'Pedido ID' }, { key: 'status', label: 'Status' }],
                order => <Link to={`/admin/finalize-payment/${order.id}`}><button>Finalizar e Cobrar</button></Link>
            )}
            {renderOrderTable("Histórico de Pedidos Finalizados", finalizedOrders, [{ key: 'id', label: 'Pedido ID' }, { key: 'data_fim', label: 'Data de Finalização' }], order => (<Link to={`/my-reservations/${order.id}`}><button>Ver pedido Completo</button></Link>))}
            {renderOrderTable("Histórico de Pedidos Cancelados", cancelledOrders, [{ key: 'id', label: 'Pedido ID' }, { key: 'status', label: 'Status' }], order => (<Link to={`/my-reservations/${order.id}`}><button>Ver Detalhes</button></Link>))}
        </div>
    );
};

export default AdminReservationsList;