import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Prejuizo {
    valor_prejuizo: string | number;
    resolvido: boolean;
}

interface ItemReserva {
    id: number;
    valor_unitario?: string | number;
    Unidade?: {
        Equipamento: {
            nome: string;
        }
    };
    prejuizo?: Prejuizo | null;
}

interface OrderDetails {
    id: number;
    status: string;
    valor_total: string;
    valor_sinal: string;
    tipo_entrega: string;
    endereco_entrega?: string;
    custo_frete: string;
    data_inicio: string;
    data_fim: string;
    ItemReservas: ItemReserva[];
}

const PaymentSuccessPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const queryIds = searchParams.get('ids'); 
    
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const paymentType = searchParams.get('payment_type'); 
    const installments = searchParams.get('installments');
    const installmentAmount = searchParams.get('installment_amount');
    const totalPaidURL = searchParams.get('total_paid');
    const cardBrand = searchParams.get('card_brand');
    const last4 = searchParams.get('last_4');

    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderDetails[]>([]);
    const [lojaConfig, setLojaConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const rawIds = queryIds || orderId || '';
    const idList = rawIds.split(',').filter(Boolean).map(Number);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        return date.toLocaleDateString('pt-BR');
    };

    useEffect(() => {
        if (idList.length === 0 || !token) return;

        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                // Busca Config da Loja para saber a % do sinal
                const { data: storeConfig } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
                setLojaConfig(storeConfig);

                const fetchedOrders = await Promise.all(
                    idList.map(id => axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/${id}`, config).then(res => res.data))
                );
                setOrders(fetchedOrders);
            } catch (error) {
                console.error("Erro ao buscar detalhes das ordens:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [rawIds, token]); 

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '100px', color: '#333' }}>Carregando recibo...</div>;
    }

    const isFailure = status === 'failure' || status === 'rejected';
    const isDivida = orders.some(o => o.status === 'finalizada' || o.status.toUpperCase() === 'PREJUIZO');
    const numInstallments = Number(installments) || 1;

    let somaTotalContratos = 0;
    let somaTotalSinais = 0;
    let somaProdutos = 0;
    let somaFrete = 0;

    const ordersDisplay = orders.map(order => {
        const vTotal = Number(order.valor_total);
        const vSinal = Number(order.valor_sinal);
        const vFrete = Number(order.custo_frete || 0);
        
        somaTotalContratos += vTotal;
        somaTotalSinais += vSinal;
        somaFrete += vFrete;

        let produtosOS = 0;
        order.ItemReservas.forEach(item => {
            produtosOS += Number(item.valor_unitario) || 0;
        });
        somaProdutos += produtosOS;

        const groupedItems: { [key: string]: { qtd: number, valorUnit: number } } = {};
        order.ItemReservas.forEach(item => {
            const nome = item.Unidade?.Equipamento?.nome || 'Equipamento';
            const valor = Number(item.valor_unitario) || 0;
            if (!groupedItems[nome]) {
                groupedItems[nome] = { qtd: 0, valorUnit: valor };
            }
            groupedItems[nome].qtd++;
        });

        return { ...order, vTotal, vSinal, groupedItems };
    });

    const isPartialPayment = lojaConfig?.sinal_porcentagem < 100 && !isDivida;
    const saldoRestante = somaTotalContratos - somaTotalSinais;
    
    // O que foi cobrado no cartão agora (pode ter juros)
    const valorBaseCobradoAgora = isDivida ? (somaTotalContratos - somaTotalSinais) : somaTotalSinais;
    const totalFinalComJuros = Number(totalPaidURL) || valorBaseCobradoAgora;
    const jurosParcelamento = totalFinalComJuros - valorBaseCobradoAgora;
    const temJuros = jurosParcelamento > 0.05;

    if (isFailure) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
                <h1 style={{ color: '#c62828' }}>Pagamento Não Aprovado</h1>
                <button onClick={() => navigate(`/payment/${idList[0]}`)} style={{ marginTop: '1.5rem', padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px' }}>Tentar Novamente</button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', backgroundColor: '#f4f7f6' }}>
            <div style={{ backgroundColor: '#fff', padding: '3rem', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '600px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill={isDivida ? "#c62828" : "#2e7d32"} style={{ marginBottom: '1.5rem' }} viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
                
                <h1 style={{ color: isDivida ? '#c62828' : '#2e7d32', fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>{isDivida ? 'Dívida Quitada!' : 'Reserva Confirmada!'}</h1>
                <p style={{ color: '#666', marginBottom: '2.5rem' }}>O comprovante foi enviado para o seu e-mail.</p>

                {ordersDisplay.map((order) => (
                    <div key={order.id} style={{ textAlign: 'left', marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid #edf2f7', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
                            <h4 style={{ margin: 0, color: '#2d3748' }}>Pedido #{order.id}</h4>
                            <span style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 'bold' }}>{formatDate(order.data_inicio)} — {formatDate(order.data_fim)}</span>
                        </div>

                        {Object.entries(order.groupedItems).map(([nome, info]) => (
                            <div key={nome} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                                <span style={{ color: '#4a5568' }}>{info.qtd}x {nome}</span>
                                <span style={{ color: '#2d3748', fontWeight: '500' }}>R$ {(info.valorUnit * info.qtd).toFixed(2)}</span>
                            </div>
                        ))}
                        
                        <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '10px', paddingTop: '10px' }}>
                             <button onClick={() => navigate(`/my-reservations/${order.id}`)} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: '1px solid #cbd5e0', color: '#4a5568', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Ver Detalhes</button>
                        </div>
                    </div>
                ))}

                <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                    
                    {/* 1. Resumo do Contrato Total (Sempre mostra se for parcial) */}
                    {isPartialPayment && (
                        <div style={{ marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#718096' }}>
                                <span>Total do Aluguel + Frete:</span>
                                <span>R$ {somaTotalContratos.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#718096', marginTop: '5px' }}>
                                <span>Sinal ({lojaConfig?.sinal_porcentagem}%):</span>
                                <span>R$ {somaTotalSinais.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {!isPartialPayment && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1rem', color: '#4a5568' }}>
                                <span>Preço dos Produtos:</span>
                                <span>R$ {somaProdutos.toFixed(2)}</span>
                            </div>
                            {somaFrete > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1rem', color: '#4a5568' }}>
                                    <span>Frete:</span>
                                    <span>R$ {somaFrete.toFixed(2)}</span>
                                </div>
                            )}
                        </>
                    )}

                    {temJuros && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', marginTop: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontWeight: '600', color: '#2d3748' }}>
                            <span>Subtotal (Valor Original):</span>
                            <span>R$ {valorBaseCobradoAgora.toFixed(2)}</span>
                        </div>
                    )}

                    {/* Bloco de Pagamento Atual */}
                    <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #edf2f7', marginBottom: '15px', marginTop: temJuros ? '0' : '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.85rem', color: '#94a3b8' }}>
                            <span>Transação: {paymentId || 'N/A'}</span>
                            <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{paymentType === 'bank_transfer' ? 'Pix' : cardBrand}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#4a5568' }}>
                            <span>{isPartialPayment ? 'Sinal Pago Agora' : 'Valor Pago Agora'}:</span>
                            <span style={{ fontWeight: 'bold' }}>
                                {numInstallments}x de R$ {Number(installmentAmount).toFixed(2)}
                            </span>
                        </div>
                        {last4 && <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'right' }}>final {last4}</div>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>Total Debitado:</span>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2d3748' }}>R$ {totalFinalComJuros.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* 3. Saldo Devedor (Se for parcial) */}
                    {isPartialPayment && saldoRestante > 0 && (
                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5', color: '#9a3412', fontSize: '0.9rem', textAlign: 'center', fontWeight: '600' }}>
                            Saldo de R$ {saldoRestante.toFixed(2)} a pagar na entrega/devolução.
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '2.5rem' }}>
                    <button onClick={() => navigate('/')} style={{ flex: 1, padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Início</button>
                    <button onClick={() => navigate('/my-reservations')} style={{ flex: 1, padding: '15px', backgroundColor: '#fff', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Meus Pedidos</button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;