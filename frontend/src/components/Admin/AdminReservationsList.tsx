import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { parseDateStringAsLocal } from '../../utils/dateUtils';

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

    const fetchAllOrders = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get('http://localhost:3001/api/reservations/all', config);
            setOrders(data);
        } catch (error) {
            console.error("Erro ao buscar todas as reservas:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAllOrders();
    }, [fetchAllOrders]);

    const ordersForExitInspection = orders.filter(order => order.status === 'aprovada');
    const ordersAwaitingSignature = orders.filter(order => order.status === 'aguardando_assinatura');
    const ordersForReturnInspection = orders.filter(order => order.status === 'em_andamento');
    const ordersAwaitingFinalPayment = orders.filter(order =>
        order.status === 'aguardando_pagamento_final'
    );

    const finalizedOrders = orders.filter(order =>
        order.status === 'finalizada' || order.status === 'PREJUIZO'
    );
    const cancelledOrders = orders.filter(order => order.status === 'cancelada');

    if (loading) return <p>A carregar reservas...</p>;

    const handleSkipInspection = async (orderId: number) => {
        if (!window.confirm("Confirmar devolução sem avarias? O pedido irá direto para o pagamento final.")) {
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`http://localhost:3001/api/reservations/${orderId}/skip-inspection`, {}, config);
            alert('Devolução rápida registrada!');
            fetchAllOrders();
        } catch (error: any) {
            alert(`Erro: ${error.response?.data?.error || 'Não foi possível processar.'}`);
        }
    };

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
                            <tr key={order.id} style={{backgroundColor: order.status === 'PREJUIZO' ? '#fff0f0' : 'inherit'}}>
                                {headers.map(header => {
                                    let cellContent: React.ReactNode;
                                    const value = order[header.key];

                                    if (typeof value === 'string' && header.key.includes('data')) {
                                        cellContent = parseDateStringAsLocal(value).toLocaleDateString();
                                    } else if (header.key === 'status') {
                                        const statusText = String(value).replace(/_/g, ' ').toUpperCase();
                                        const color = value === 'PREJUIZO' ? 'red' : (value === 'finalizada' ? 'green' : 'black');
                                        cellContent = <span style={{fontWeight: 'bold', color: color}}>{statusText}</span>;
                                    } else {
                                        cellContent = value;
                                    }

                                    return (
                                        <td key={header.key} style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            {cellContent}
                                        </td>
                                    );
                                })}
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
                order => (
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <Link to={`/admin/vistoria/${order.id}?tipo=devolucao`}>
                            <button style={{ backgroundColor: '#ffc107', color: '#212529' }}>Registrar Vistoria (com avarias)</button>
                        </Link>
                        <button
                            onClick={() => handleSkipInspection(order.id)}
                            style={{ backgroundColor: '#28a745', color: 'white' }}
                        >
                            Devolução Rápida (OK)
                        </button>
                    </div>
                )
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