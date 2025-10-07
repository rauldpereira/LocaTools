import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const { token } = useAuth();

    useEffect(() => {
        if (!orderId || !token) return;

        const fetchOrder = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);
            } catch (error) {
                console.error("Erro ao buscar detalhes da ordem:", error);
            }
        };
        fetchOrder();
    }, [orderId, token]);

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
            <p>Sua reserva foi confirmada com sucesso.</p>

            {order && (
                <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', backgroundColor: '#f9f9f9', color: '#333' }}>
                    <p><strong>Resumo do Pedido #{order.id}</strong></p>
                    <p>Sinal pago: R$ {Number(order.valor_sinal).toFixed(2)}</p>
                    {order.tipo_entrega === 'entrega' ? (
                        <p>A entrega será feita no endereço: {order.endereco_entrega}</p>
                    ) : (
                        <p>Você escolheu retirar o equipamento em nossa loja.</p>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button onClick={() => navigate('/my-reservations')} style={{ padding: '10px 20px' }}>
                    Ver Minhas Reservas
                </button>
                <button onClick={() => navigate('/')} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white' }}>
                    Voltar para o Início
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;