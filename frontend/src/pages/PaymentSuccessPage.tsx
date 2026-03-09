import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface OrderDetails {
    id: number;
    valor_sinal: string;
    tipo_entrega: string;
    endereco_entrega?: string;
}

const PaymentSuccessPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const queryIds = searchParams.get('ids'); 

    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const rawIds = queryIds || orderId || '';
    const idList = rawIds.split(',').filter(Boolean).map(Number);

    useEffect(() => {
        if (idList.length === 0 || !token) return;

        const fetchOrders = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                // Busca todas as ordens que o cliente acabou de pagar
                const fetchedOrders = await Promise.all(
                    idList.map(id => axios.get(`http://localhost:3001/api/reservations/${id}`, config).then(res => res.data))
                );
                setOrders(fetchedOrders);
            } catch (error) {
                console.error("Erro ao buscar detalhes das ordens:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [rawIds, token]);

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '100px', color: '#333' }}>Carregando recibo...</div>;
    }

    const isMultiple = orders.length > 1;
    const totalSinalPago = orders.reduce((acc, curr) => acc + Number(curr.valor_sinal), 0);

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            textAlign: 'center', 
            minHeight: '80vh',
            padding: '2rem'
        }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="green" className="bi bi-check-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
            
            <h1 style={{ color: '#2e7d32', marginTop: '1rem' }}>Pagamento Aprovado!</h1>
            <p style={{ fontSize: '1.1rem', color: '#555' }}>
                {isMultiple 
                    ? `Suas ${orders.length} reservas foram confirmadas com sucesso.` 
                    : 'Sua reserva foi confirmada com sucesso.'}
            </p>

            {orders.length > 0 && (
                <div style={{ 
                    border: '1px solid #ddd', padding: '2rem', borderRadius: '12px', 
                    marginTop: '1.5rem', backgroundColor: '#f9f9f9', color: '#333',
                    width: '100%', maxWidth: '500px', textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{ marginTop: 0, borderBottom: '2px solid #2e7d32', paddingBottom: '10px' }}>
                        Resumo {isMultiple ? 'dos Pedidos' : 'do Pedido'}
                    </h3>
                    
                    {orders.map((order, index) => (
                        <div key={order.id} style={{ 
                            marginBottom: '15px', 
                            paddingBottom: '15px', 
                            borderBottom: index === orders.length - 1 ? 'none' : '1px dashed #ccc' 
                        }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Pedido #{order.id}</p>
                            <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                                <strong>Logística:</strong> {order.tipo_entrega === 'entrega' ? `Entrega em: ${order.endereco_entrega}` : 'Retirada na Loja'}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#2e7d32' }}>
                                <strong>Sinal desta etapa:</strong> R$ {Number(order.valor_sinal).toFixed(2)}
                            </p>
                        </div>
                    ))}

                    {isMultiple && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #ddd', textAlign: 'right' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                Total Pago Agora: R$ {totalSinalPago.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                    onClick={() => navigate('/my-reservations')} 
                    style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Ver Minhas Reservas
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