import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface TipoAvaria {
    id: number;
    descricao: string;
    preco: string;
}
interface AvariaEncontrada {
    id: number;
    id_tipo_avaria: number;
    TipoAvaria: TipoAvaria;
}
interface DetalheVistoria {
    id: number;
    id_item_equipamento: number;
    comentarios: string;
    avariasEncontradas: AvariaEncontrada[];
}
interface Vistoria {
    id: number;
    tipo_vistoria: 'entrega' | 'devolucao';
    detalhes: DetalheVistoria[];
}
interface OrderDetails {
    id: number;
    valor_total: string;
    valor_sinal: string;
    taxa_remarcacao?: string;
    ItemReservas: any[];
    Vistorias: Vistoria[];
}

const FinalizePaymentPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const [newDamages, setNewDamages] = useState<TipoAvaria[]>([]);
    const [outrosComment, setOutrosComment] = useState("");
    const [outrosFee, setOutrosFee] = useState(0);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!token || !orderId) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);
                calculateNewDamageFee(data);
            } catch (error) {
                console.error("Erro ao buscar detalhes da ordem:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [orderId, token]);

    const calculateNewDamageFee = (orderData: OrderDetails) => {
        const vistoriaSaida = orderData.Vistorias.find(v => v.tipo_vistoria === 'entrega');
        const vistoriaDevolucao = orderData.Vistorias.find(v => v.tipo_vistoria === 'devolucao');
        
        const avariasNovasEncontradas: TipoAvaria[] = [];
        let comentarioOutros = "";

        if (vistoriaDevolucao) {
            for (const detalheDev of vistoriaDevolucao.detalhes) {
                const detalheSaida = vistoriaSaida?.detalhes.find(d => d.id_item_equipamento === detalheDev.id_item_equipamento);
                const avariasSaidaIDs = new Set(detalheSaida?.avariasEncontradas?.map(a => a.id_tipo_avaria) || []);
                
                const avariasDevolucao = detalheDev.avariasEncontradas || [];

                for (const avaria of avariasDevolucao) {
                    if (!avariasSaidaIDs.has(avaria.id_tipo_avaria)) {
                        if (avaria.TipoAvaria.descricao.toLowerCase() === 'outros') {
                            comentarioOutros = detalheDev.comentarios || "Dano 'Outros' registrado.";
                        } else {
                            avariasNovasEncontradas.push(avaria.TipoAvaria);
                        }
                    }
                }
            }
        }
        setNewDamages(avariasNovasEncontradas);
        setOutrosComment(comentarioOutros);
    };

    const handleManualConfirmation = async () => {
        if (!order) return;
        const finalDamageFee = calculatedFee + outrosFee;

        if (!window.confirm(`Confirmar recebimento de R$ ${valorFinal.toFixed(2)} e finalizar ordem?`)) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { damageFee: finalDamageFee };
            await axios.put(`http://localhost:3001/api/reservations/${orderId}/confirm-manual-payment`, body, config);
            alert("Ordem finalizada com sucesso!");
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao confirmar pagamento manual:", error);
            alert("Falha ao finalizar ordem.");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !order) return <p>Carregando...</p>;

    const valorRestante = Number(order.valor_total) - Number(order.valor_sinal);
    const taxaRemarcacao = Number(order.taxa_remarcacao || 0);
    const calculatedFee = newDamages.reduce((acc, avaria) => acc + Number(avaria.preco), 0);
    const valorFinal = valorRestante + calculatedFee + outrosFee + taxaRemarcacao;

    return (
        <div style={{ padding: '2rem', marginTop: '60px' }}>
            <h1>Finalizar Pedido #{orderId}</h1>

            <div className="damage-assessment" style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h3>Avarias Detectadas na Devolução</h3>

                {newDamages.length > 0 ? (
                    <div>
                        <p>Novas avarias catalogadas:</p>
                        <ul style={{color: 'red'}}>
                            {newDamages.map(avaria => (
                                <li key={avaria.id}>{avaria.descricao} - R$ {Number(avaria.preco).toFixed(2)}</li>
                            ))}
                        </ul>
                        <p style={{fontWeight: 'bold'}}>Subtotal Avarias: R$ {calculatedFee.toFixed(2)}</p>
                    </div>
                ) : <p>Nenhuma avaria catalogada nova detectada.</p>}

                <hr style={{ margin: '1rem 0' }} />

                {outrosComment ? (
                    <p><strong>Comentários da Vistoria:</strong> "{outrosComment}"</p>
                ) : (
                    <p>Nenhum comentário registrado.</p>
                )}
                <label>
                    Adicionar Preço para "Outros" (manual): R$
                    <input
                        type="number"
                        value={outrosFee}
                        onChange={(e) => setOutrosFee(Number(e.target.value))}
                        min="0"
                    />
                </label>
            </div>

            <div className="summary" style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
                <h3>Resumo Financeiro Final</h3>
                <p>Valor Restante do Aluguel: R$ {valorRestante.toFixed(2)}</p>
                {taxaRemarcacao > 0 && (
                    <p style={{ color: 'orange' }}>Taxa de Remarcação: + R$ {taxaRemarcacao.toFixed(2)}</p>
                )}
                <p style={{ color: 'red' }}>Total de Avarias (Auto + Manual): + R$ {(calculatedFee + outrosFee).toFixed(2)}</p>
                <hr />
                <h2 style={{ color: 'red' }}>Total a Receber do Cliente: R$ {valorFinal.toFixed(2)}</h2>
            </div>
            
            <button 
                onClick={handleManualConfirmation} 
                disabled={loading}
                style={{ padding: '1rem', fontSize: '1.2rem', backgroundColor: 'green', color: 'white', marginTop: '1rem' }}
            >
                {loading ? 'Finalizando...' : 'Confirmar Recebimento e Finalizar Ordem'}
            </button>
        </div>
    );
};

export default FinalizePaymentPage;