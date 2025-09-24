import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface OrderDetails {
    id: number;
    valor_total: number;
    valor_sinal: number;
    tipo_entrega: string;
    endereco_entrega?: string;
    custo_frete: number;
}

const CheckoutForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const { orderId } = useParams<{ orderId: string }>();
    const { token: authToken } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        setError(null);

        if (!stripe || !elements || !authToken) {
            setError('Ocorreu um erro ao carregar o pagamento.');
            setProcessing(false);
            return;
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError('Elemento do cartão não encontrado.');
            setProcessing(false);
            return;
        }

        const { error: stripeError, token: stripeToken } = await stripe.createToken(cardElement);

        if (stripeError) {
            setError(stripeError.message || 'Ocorreu um erro ao validar o cartão.');
            setProcessing(false);
            return;
        }

        if (stripeToken) {
            try {
                const config = { headers: { Authorization: `Bearer ${authToken}` } };
                await axios.post('http://localhost:3001/api/payments/process', {
                    orderId: orderId,
                    token: stripeToken.id,
                }, config);

                navigate(`/payment/success/${orderId}`);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Falha ao processar o pagamento no servidor.');
                setProcessing(false);
            }
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                color: '#32325d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a',
            },
        },
        hidePostalCode: true,
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '20px' }}>Insira os Dados do Cartão</h3>
            <CardElement options={cardElementOptions} />
            {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
            <button
                disabled={!stripe || processing}
                type="submit"
                style={{ marginTop: '20px', width: '100%', padding: '12px', fontSize: '16px', cursor: 'pointer' }}
            >
                {processing ? 'Processando...' : 'Pagar Agora'}
            </button>
        </form>
    );
};



const PaymentPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
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
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId, token]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Carregando detalhes do pedido...</div>;
    if (!order) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Pedido não encontrado.</div>;

    const subtotal = Number(order.valor_total) - Number(order.custo_frete);

    return (
        <div style={{ maxWidth: '600px', margin: '100px auto', fontFamily: 'sans-serif' }}>
            <div className="order-summary" style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4>Resumo do Pedido #{orderId}</h4>
                <p>Subtotal dos Itens: R$ {subtotal.toFixed(2)}</p>
                <p>Entrega: {order.tipo_entrega === 'entrega' ? `Frete: R$ ${Number(order.custo_frete).toFixed(2)}` : 'Retirada na Loja (Grátis)'}</p>
                {order.tipo_entrega === 'entrega' && <p style={{ fontSize: '0.9em', color: '#555' }}>Endereço: {order.endereco_entrega}</p>}
                <hr />
                <p style={{ fontWeight: 'bold' }}>Valor Total: R$ {Number(order.valor_total).toFixed(2)}</p>
                <h3 style={{ color: 'green' }}>Valor do Sinal a Pagar (50%): R$ {Number(order.valor_sinal).toFixed(2)}</h3>
            </div>
            <div className="payment-form" style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px' }}>
                <CheckoutForm />
            </div>
        </div>
    );
};

export default PaymentPage;