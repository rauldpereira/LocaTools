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
        <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ color: '#444', borderLeft: '4px solid #007bff', paddingLeft: '10px', marginBottom: '1rem' }}>
                {title} <span style={{fontSize:'0.8rem', color:'#888', fontWeight:'normal'}}>({orderList.length})</span>
            </h3>
            
            {orderList.length === 0 ? (
                <div style={{ padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
                    Nenhum pedido nesta etapa.
                </div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa', color: '#555', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                                {headers.map(header => (
                                    <th key={header.key} style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>{header.label}</th>
                                ))}
                                <th style={{ padding: '15px', borderBottom: '2px solid #ddd' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderList.map((order, index) => {
                                const isPrejuizo = order.status === 'PREJUIZO';
                                const rowStyle = {
                                    backgroundColor: isPrejuizo ? '#fff0f0' : (index % 2 === 0 ? '#fff' : '#fcfcfc'), // Zebrado
                                    borderBottom: '1px solid #eee'
                                };
                                
                                return (
                                    <tr key={order.id} style={rowStyle}>
                                        {headers.map(header => {
                                            let cellContent: React.ReactNode;
                                            const value = order[header.key];

                                            if (typeof value === 'string' && header.key.includes('data')) {
                                                cellContent = parseDateStringAsLocal(value).toLocaleDateString();
                                            } else if (header.key === 'status') {
                                                const statusText = String(value).replace(/_/g, ' ').toUpperCase();
                                                
                                                const color = isPrejuizo ? '#d32f2f' : (value === 'finalizada' ? '#28a745' : '#333');
                                                const bgBadge = isPrejuizo ? '#ffebee' : (value === 'finalizada' ? '#e6fffa' : 'transparent');
                                                
                                                cellContent = (
                                                    <span style={{
                                                        fontWeight: 'bold', color: color, 
                                                        backgroundColor: bgBadge, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'
                                                    }}>
                                                        {isPrejuizo ? '🚨 ' : ''}{statusText}
                                                    </span>
                                                );
                                            } else {
                                                cellContent = value;
                                            }

                                            return (
                                                <td key={header.key} style={{ padding: '15px', color: '#333' }}>
                                                    {cellContent}
                                                </td>
                                            );
                                        })}
                                        <td style={{ padding: '15px' }}>{action(order)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
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