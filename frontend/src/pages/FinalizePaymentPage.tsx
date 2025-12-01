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
interface ItemReserva {
    id: number;
    status?: string;
    Unidade: {
        id: number;
        Equipamento: { nome: string; }
    };
    prejuizo?: {
        id: number;
        tipo: string;
        valor_prejuizo: string | number;
        observacao: string;
    } | null;
}
interface OrderDetails {
    id: number;
    valor_total: string;
    valor_sinal: string;
    taxa_remarcacao?: string;
    status: string;
    ItemReservas: ItemReserva[];
    Vistorias: Vistoria[];
    custo_frete: string;
    taxa_avaria: string;
    taxa_cancelamento?: string;
    valor_reembolsado?: string;
    tipo_entrega: string;
    endereco_entrega?: string;
    data_inicio: string;
    data_fim: string;
}

const FinalizePaymentPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const [newDamages, setNewDamages] = useState<TipoAvaria[]>([]);
    const [outrosFee, setOutrosFee] = useState(0);

    const fetchOrderDetails = async () => {
        if (!token || !orderId) return;
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
            setOrder(data);
            calculateNewDamageFee(data);
        } catch (error) {
            console.error("Erro ao buscar detalhes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId, token]);

    const calculateNewDamageFee = (orderData: OrderDetails) => {
        const vistoriaSaida = orderData.Vistorias.find(v => v.tipo_vistoria === 'entrega');
        const vistoriaDevolucao = orderData.Vistorias.find(v => v.tipo_vistoria === 'devolucao');
        const avariasNovasEncontradas: TipoAvaria[] = [];

        if (vistoriaDevolucao) {
            for (const detalheDev of vistoriaDevolucao.detalhes) {
                const detalheSaida = vistoriaSaida?.detalhes.find(d => d.id_item_equipamento === detalheDev.id_item_equipamento);
                const avariasSaidaIDs = new Set(detalheSaida?.avariasEncontradas?.map(a => a.id_tipo_avaria) || []);
                const avariasDevolucao = detalheDev.avariasEncontradas || [];
                for (const avaria of avariasDevolucao) {
                    if (!avariasSaidaIDs.has(avaria.id_tipo_avaria)) {
                        // Se não for "outros", adiciona na lista de cobrança automática
                        if (avaria.TipoAvaria.descricao.toLowerCase() !== 'outros') {
                            avariasNovasEncontradas.push(avaria.TipoAvaria);
                        }
                        // Se for "outros", a gente ignora aqui pq o admin vai por o valor manual no campo "Adicionar Valor Manual"
                    }
                }
            }
        }
        setNewDamages(avariasNovasEncontradas);
    };

    const valorRestante = order ? Number(order.valor_total) - Number(order.valor_sinal) : 0;
    const taxaRemarcacao = order ? Number(order.taxa_remarcacao || 0) : 0;
    const calculatedFee = newDamages.reduce((acc, avaria) => acc + Number(avaria.preco), 0);

    // Soma os prejuízos registrados na Vistoria
    const totalPrejuizos = order ? order.ItemReservas.reduce((acc, item) => {
        return acc + (item.prejuizo ? Number(item.prejuizo.valor_prejuizo) : 0);
    }, 0) : 0;

    const valorFinal = valorRestante + calculatedFee + outrosFee + taxaRemarcacao + totalPrejuizos;

    const handleManualConfirmation = async () => {
        if (!order) return;
        const totalExtras = calculatedFee + outrosFee + totalPrejuizos;

        if (!window.confirm(`Confirmar recebimento de R$ ${valorFinal.toFixed(2)} e finalizar ordem?`)) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { damageFee: totalExtras };
            await axios.put(`http://localhost:3001/api/reservations/${orderId}/confirm-manual-payment`, body, config);
            alert("Pagamento confirmado e ordem finalizada!");
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao confirmar:", error);
            alert("Falha ao finalizar ordem.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinishWithDebt = async () => {
        if (!window.confirm("ATENÇÃO: Você está encerrando SEM confirmar o pagamento total.\n\nO pedido ficará com status 'PREJUÍZO' e o valor ficará como pendência. Deseja continuar?")) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`http://localhost:3001/api/reservations/${orderId}/finish-with-debt`, {}, config);
            alert("Ordem encerrada com pendências financeiras.");
            navigate('/admin');
        } catch (error) {
            console.error("Erro ao finalizar com dívida:", error);
            alert("Falha ao encerrar ordem.");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !order) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Carregando...</p>;

    return (
        <div style={{ padding: '2rem', marginTop: '60px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Finalizar Pedido #{orderId}</h1>

            {order.status === 'PREJUIZO' && (
                <div style={{ backgroundColor: '#ffe6e6', padding: '15px', border: '1px solid red', borderRadius: '5px', marginBottom: '2rem' }}>
                    <h3 style={{ color: 'red', margin: '0 0 10px 0' }}>Atenção: Este pedido possui B.O./Prejuízo registrado</h3>
                    <p style={{ margin: 0 }}>O valor dos itens perdidos foi adicionado ao total abaixo.</p>
                </div>
            )}

            <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <h3>Itens do Pedido</h3>
                {order.ItemReservas.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                        <div>
                            <strong>{item.Unidade.Equipamento.nome}</strong> <span style={{ color: '#666', fontSize: '0.9rem' }}>(ID: {item.Unidade.id})</span>

                            {item.prejuizo && (
                                <div style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '5px' }}>
                                    <strong>{item.prejuizo.tipo}:</strong> R$ {Number(item.prejuizo.valor_prejuizo).toFixed(2)}
                                    <br />
                                    <span style={{ fontStyle: 'italic', color: '#666' }}>Obs: {item.prejuizo.observacao}</span>
                                </div>
                            )}
                        </div>

                        {item.status === 'FINALIZADO_COM_PREJUIZO' && (
                            <span style={{ color: 'red', fontWeight: 'bold', border: '1px solid red', padding: '2px 5px', borderRadius: '4px' }}>B.O. REGISTRADO</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="damage-assessment" style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <h3>Custos Adicionais (Avarias/Outros)</h3>
                {newDamages.length > 0 ? (
                    <div>
                        <p>Novas avarias catalogadas na devolução:</p>
                        <ul style={{ color: '#dc3545' }}>
                            {newDamages.map(avaria => (
                                <li key={avaria.id}>{avaria.descricao} - R$ {Number(avaria.preco).toFixed(2)}</li>
                            ))}
                        </ul>
                        <p style={{ fontWeight: 'bold', textAlign: 'right' }}>Subtotal Avarias: R$ {calculatedFee.toFixed(2)}</p>
                    </div>
                ) : <p style={{ color: '#666' }}>Nenhuma avaria catalogada nova detectada.</p>}

                <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    Adicionar Valor Manual (Outros/Multa):
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        R$
                        <input
                            type="number"
                            value={outrosFee}
                            onChange={(e) => setOutrosFee(Number(e.target.value))}
                            min="0"
                            style={{ marginLeft: '5px', padding: '5px', width: '100px', textAlign: 'right' }}
                        />
                    </div>
                </label>
            </div>

            <div className="summary" style={{ border: '2px solid #333', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#fdfdfd' }}>
                <h2 style={{ marginTop: 0, borderBottom: '2px solid #333', paddingBottom: '10px' }}>Resumo Final</h2>
                <div style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Valor Restante do Aluguel:</span>
                        <span>R$ {valorRestante.toFixed(2)}</span>
                    </div>
                    {taxaRemarcacao > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e67e22' }}>
                            <span>Taxa de Remarcação:</span>
                            <span>+ R$ {taxaRemarcacao.toFixed(2)}</span>
                        </div>
                    )}
                    {(calculatedFee + outrosFee) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc3545' }}>
                            <span>Avarias e Extras:</span>
                            <span>+ R$ {(calculatedFee + outrosFee).toFixed(2)}</span>
                        </div>
                    )}
                    {totalPrejuizos > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b00020', fontWeight: 'bold' }}>
                            <span>Roubos / Extravios / B.O.:</span>
                            <span>+ R$ {totalPrejuizos.toFixed(2)}</span>
                        </div>
                    )}
                    <hr style={{ margin: '10px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                        <span>TOTAL A RECEBER:</span>
                        <span>R$ {valorFinal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                <button
                    onClick={handleFinishWithDebt}
                    disabled={loading}
                    style={{
                        padding: '1rem', fontSize: '1rem', fontWeight: 'bold',
                        backgroundColor: 'white', color: '#e67e22',
                        border: '2px solid #e67e22', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⚠️</span>
                    Encerrar com Pendência
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>(Gerar Dívida / Não Pago)</span>
                </button>

                <button
                    onClick={handleManualConfirmation}
                    disabled={loading}
                    style={{
                        padding: '1rem', fontSize: '1rem', fontWeight: 'bold',
                        backgroundColor: '#28a745', color: 'white',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    <span style={{ fontSize: '1.5rem', marginBottom: '5px' }}>✅</span>
                    Confirmar Recebimento Total
                    <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>(R$ {valorFinal.toFixed(2)})</span>
                </button>
            </div>
        </div>
    );
};

export default FinalizePaymentPage;