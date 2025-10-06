import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const FinalizePaymentPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const [damageFee, setDamageFee] = useState(0); 
    const [paymentLink, setPaymentLink] = useState(''); 

    useEffect(() => {
        
        const fetchOrderDetails = async () => {
            if (!token || !orderId) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);
            } catch (error) {
                console.error("Erro ao buscar detalhes da ordem:", error);
            }
        };
        fetchOrderDetails();
    }, [orderId, token]);

    const handleManualConfirmation = async () => {
        if (!window.confirm("Você confirma que o pagamento restante foi recebido manualmente?")) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`http://localhost:3001/api/reservations/${orderId}/confirm-manual-payment`, {}, config);
            alert("Ordem finalizada com sucesso!");
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao confirmar pagamento manual:", error);
            alert("Falha ao finalizar ordem.");
        }
    };

    const handleGeneratePixLink = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.post('http://localhost:3001/api/payments/create-checkout-session', { orderId }, config);
            setPaymentLink(data.url);
        } catch (error) {
            console.error("Erro ao gerar link de pagamento:", error);
            alert("Falha ao gerar link de pagamento.");
        }
    };

    if (!order) return <p>Carregando...</p>;

    const valorRestante = Number(order.valor_total) - Number(order.valor_sinal);
    const valorFinal = valorRestante + damageFee;

    const vistoriaDevolucao = order.Vistorias.find((v: any) => v.tipo_vistoria === 'devolucao');

    return (
        <div style={{ padding: '2rem', marginTop: '60px' }}>
            <h1>Finalizar Pedido #{orderId}</h1>

           
            {vistoriaDevolucao && <h4>Análise da Vistoria de Devolução...</h4>}

            <div className="final-payment-section">
                <h3>Resumo Financeiro</h3>
                <p>Valor Restante do Aluguel: R$ {valorRestante.toFixed(2)}</p>
                <label>
                    Adicionar Taxa por Avarias: R$
                    <input type="number" value={damageFee} onChange={(e) => setDamageFee(Number(e.target.value))} min="0" />
                </label>
                <h2 style={{ color: 'red' }}>Total a Cobrar: R$ {valorFinal.toFixed(2)}</h2>
            </div>
            
            <hr style={{ margin: '2rem 0' }} />

            <div className="action-buttons" style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={handleManualConfirmation} style={{ backgroundColor: 'green', color: 'white' }}>
                    Confirmar Pagamento na Máquina
                </button>
                <button onClick={handleGeneratePixLink}>
                    Gerar Link de Pagamento Pix
                </button>
            </div>

            {paymentLink && (
                <div style={{ marginTop: '2rem' }}>
                    <h4>Link de Pagamento Gerado:</h4>
                    <input type="text" readOnly value={paymentLink} style={{ width: '100%' }} />
                    <p>Copie e envie este link para o cliente.</p>
                </div>
            )}
        </div>
    );
};

export default FinalizePaymentPage;