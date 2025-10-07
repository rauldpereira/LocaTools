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
    const [loading, setLoading] = useState(false);

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
        if (!window.confirm("Você confirma que o pagamento restante (incluindo taxas) foi recebido manualmente? Esta ação finalizará a ordem de serviço.")) return;
        
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.put(`http://localhost:3001/api/reservations/${orderId}/confirm-manual-payment`, {}, config);
            alert("Ordem finalizada com sucesso!");
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao confirmar pagamento manual:", error);
            alert("Falha ao finalizar ordem.");
        } finally {
            setLoading(false);
        }
    };

    if (!order) return <p>Carregando...</p>;

    const valorRestante = Number(order.valor_total) - Number(order.valor_sinal);
    const valorFinal = valorRestante + damageFee;

    return (
        <div style={{ padding: '2rem', marginTop: '60px' }}>
            <h1>Finalizar Pedido #{orderId}</h1>

            <div className="summary">
                <h3>Resumo Financeiro</h3>
                <p>Valor Total do Aluguel: R$ {Number(order.valor_total).toFixed(2)}</p>
                <p>Sinal Pago: - R$ {Number(order.valor_sinal).toFixed(2)}</p>
                <p style={{ fontWeight: 'bold' }}>Valor Restante: R$ {valorRestante.toFixed(2)}</p>
            </div>

            <div className="damage-assessment" style={{ marginTop: '2rem' }}>
                <h3>Análise de Avarias (Vistoria de Devolução)</h3>
                <label>
                    Adicionar Taxa Adicional por Avarias: R$
                    <input 
                        type="number" 
                        value={damageFee} 
                        onChange={(e) => setDamageFee(Number(e.target.value))} 
                        min="0"
                    />
                </label>
            </div>

            <hr style={{ margin: '2rem 0' }} />

            <div className="final-payment">
                <h2 style={{ color: 'red' }}>Total a Receber do Cliente: R$ {valorFinal.toFixed(2)}</h2>
                <button 
                    onClick={handleManualConfirmation} 
                    disabled={loading}
                    style={{ padding: '1rem', fontSize: '1.2rem', backgroundColor: 'green', color: 'white', cursor: 'pointer' }}
                >
                    {loading ? 'Finalizando...' : 'Confirmar Recebimento e Finalizar Ordem'}
                </button>
            </div>
        </div>
    );
};

export default FinalizePaymentPage;