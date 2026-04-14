import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Prejuizo {
    valor_prejuizo: string | number;
    resolvido: boolean;
}
interface ItemReserva {
    prejuizo?: Prejuizo | null;
}
interface OrderDetails {
    id: number;
    status: string;
    valor_total: string;
    valor_sinal: string;
    tipo_entrega: string;
    endereco_entrega?: string;
    ItemReservas?: ItemReserva[];
}

const PaymentSuccessPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const queryIds = searchParams.get('ids'); 

    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderDetails[]>([]);
    const [lojaConfig, setLojaConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const rawIds = queryIds || orderId || '';
    const idList = rawIds.split(',').filter(Boolean).map(Number);

    useEffect(() => {
        if (idList.length === 0 || !token) return;

        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                // Busca Config da Loja
                const { data: storeConfig } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
                setLojaConfig(storeConfig);

                // Busca Detalhes das Ordens
                const fetchedOrders = await Promise.all(
                    idList.map(id => axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/${id}`, config).then(res => res.data))
                );
                setOrders(fetchedOrders);
            } catch (error) {
                console.error("Erro ao buscar detalhes das ordens/config:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [rawIds, token]);

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '100px', color: '#333' }}>Carregando recibo...</div>;
    }

    const isMultiple = orders.length > 1;

    const isDivida = orders.some(o => o.status === 'finalizada');

    let totalPagoAgora = 0;

    const ordersDisplay = orders.map(order => {
        let valorPagoNestaOS = 0;
        let saldoAluguel = 0;
        let valorPrejuizos = 0;

        if (order.status === 'finalizada') {
            saldoAluguel = Number(order.valor_total) - Number(order.valor_sinal);
            
            if (order.ItemReservas) {
                order.ItemReservas.forEach(item => {
                    if (item.prejuizo) {
                        valorPrejuizos += Number(item.prejuizo.valor_prejuizo);
                    }
                });
            }
            valorPagoNestaOS = saldoAluguel + valorPrejuizos;
        } else {
            valorPagoNestaOS = Number(order.valor_sinal);
        }

        totalPagoAgora += valorPagoNestaOS;

        return { ...order, valorPagoNestaOS, saldoAluguel, valorPrejuizos };
    });

    return (
        <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', 
            justifyContent: 'center', textAlign: 'center', minHeight: '80vh', padding: '2rem'
        }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill={isDivida ? "#c62828" : "green"} className="bi bi-check-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
            
            <h1 style={{ color: isDivida ? '#c62828' : '#2e7d32', marginTop: '1rem' }}>
                {isDivida ? 'Dívida Quitada com Sucesso!' : 'Pagamento Aprovado!'}
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#555' }}>
                {isDivida 
                    ? 'Suas pendências financeiras foram regularizadas.'
                    : (isMultiple ? `Suas ${orders.length} reservas foram confirmadas.` : 'Sua reserva foi confirmada com sucesso.')}
            </p>

            {ordersDisplay.length > 0 && (
                <div style={{ 
                    border: `1px solid ${isDivida ? '#ffcdd2' : '#ddd'}`, 
                    padding: '2rem', borderRadius: '12px', 
                    marginTop: '1.5rem', 
                    backgroundColor: isDivida ? '#ffebee' : '#f9f9f9', 
                    color: '#333', width: '100%', maxWidth: '500px', textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{ marginTop: 0, borderBottom: `2px solid ${isDivida ? '#c62828' : '#2e7d32'}`, paddingBottom: '10px', color: isDivida ? '#c62828' : '#333' }}>
                        {isDivida ? 'Comprovante de Quitação' : (isMultiple ? 'Resumo dos Pedidos' : 'Resumo do Pedido')}
                    </h3>
                    
                    {ordersDisplay.map((order, index) => (
                        <div key={order.id} style={{ 
                            marginBottom: '15px', paddingBottom: '15px', 
                            borderBottom: index === ordersDisplay.length - 1 ? 'none' : `1px dashed ${isDivida ? '#ffcdd2' : '#ccc'}` 
                        }}>
                            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '1.1rem' }}>Pedido #{order.id}</p>
                            
                            {!isDivida ? (
                                // FLUXO NORMAL (Sinal)
                                <>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '0.95rem' }}>
                                        <strong>Logística:</strong> {order.tipo_entrega === 'entrega' ? `Entrega em: ${order.endereco_entrega}` : 'Retirada na Loja'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '1.05rem', color: '#2e7d32', fontWeight: 'bold' }}>
                                        {lojaConfig?.sinal_porcentagem >= 100 ? 'Pagamento Integral:' : 'Sinal desta etapa:'} R$ {order.valorPagoNestaOS.toFixed(2)}
                                    </p>
                                </>
                            ) : (
                                // FLUXO Dívida Detalhada
                                <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ffcdd2' }}>
                                    {order.saldoAluguel > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.95rem', color: '#555' }}>
                                            <span>Saldo do Aluguel:</span>
                                            <span>R$ {order.saldoAluguel.toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {order.valorPrejuizos > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', color: '#c62828' }}>
                                            <span>Avarias / Extravios:</span>
                                            <span>R$ {order.valorPrejuizos.toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '8px', fontWeight: 'bold', color: '#c62828', fontSize: '1.05rem' }}>
                                        <span>Total Quitado:</span>
                                        <span>R$ {order.valorPagoNestaOS.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {isMultiple && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `2px solid ${isDivida ? '#ef9a9a' : '#ddd'}`, textAlign: 'right' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isDivida ? '#c62828' : '#333' }}>
                                Total Pago Agora: R$ {totalPagoAgora.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                    onClick={() => navigate('/my-reservations')} 
                    style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Ver Meus Pedidos
                </button>
                <button 
                    onClick={() => navigate('/')} 
                    style={{ padding: '12px 24px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Voltar para o Início
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;