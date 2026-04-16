import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface UsuarioDaOrdem {
    id: number;
    nome: string;
    email: string;
    cpf?: string;
    cnpj?: string;
    tipo_pessoa?: 'fisica' | 'juridica';
}

interface OrderDetails {
    id: number;
    status: string;
    valor_total: number;
    valor_sinal: number;
    tipo_entrega: string;
    endereco_entrega?: string;
    custo_frete: number;
    Usuario: UsuarioDaOrdem;
    createdAt?: string;
}

interface Prejuizo {
    valor_prejuizo: string | number;
    resolvido: boolean;
}
interface ItemReserva {
    prejuizo?: Prejuizo | null;
}
interface OrderDetailsExpanded extends OrderDetails {
    ItemReservas?: ItemReserva[];
}

const PaymentPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const queryIds = searchParams.get('ids');

    const [orders, setOrders] = useState<OrderDetailsExpanded[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const navigate = useNavigate();
    const [isMpLoaded, setIsMpLoaded] = useState(false);

    // --- LOJA E FIDELIDADE ---
    const [loyaltyConfig, setLoyaltyConfig] = useState<{ num: number, pct: number, ativo: boolean } | null>(null);
    const [lojaConfig, setLojaConfig] = useState<any>(null);
    const [completedOrders, setCompletedOrders] = useState(0);

    const rawIds = queryIds || orderId || '';
    const idList = rawIds.split(',').filter(Boolean).map(Number);

    useEffect(() => {
        const key = import.meta.env.VITE_MP_PUBLIC_KEY;
        if (key) {
            initMercadoPago(key, { locale: 'pt-BR' });
            setIsMpLoaded(true);
        } else {
            console.error('ERRO: VITE_MP_PUBLIC_KEY não encontrada nas variáveis de ambiente.');
        }
    }, []);

    useEffect(() => {
        const fetchStoreData = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data: storeConfig } = await axios.get(`${import.meta.env.VITE_API_URL}/api/config`);
                if (storeConfig) {
                    setLojaConfig(storeConfig);
                    setLoyaltyConfig({
                        num: storeConfig.fidelidade_num_pedidos,
                        pct: parseFloat(storeConfig.fidelidade_desconto_pct),
                        ativo: !!storeConfig.fidelidade_ativo
                    });
                }
                const { data: myOrders } = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/my`, config);
                const count = myOrders.filter((o: any) => o.status !== 'cancelada').length;
                setCompletedOrders(count);
            } catch (error) {
                console.error('Erro ao buscar dados da loja:', error);
            }
        };
        fetchStoreData();
    }, [token]);

    useEffect(() => {
        if (idList.length === 0 || !token) return;

        const fetchOrders = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const fetchedOrders = await Promise.all(
                    idList.map(id => axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/${id}`, config).then(res => res.data))
                );
                setOrders(fetchedOrders);
            } catch (error) {
                console.error("Erro ao buscar pedidos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [rawIds, token]);

    // Cálculos de valores 
    const { valorApresentado, totalSaldoAluguel, totalPrejuizos, isDivida, totalGeral, totalFrete, subtotalOriginal, valorDesconto, isLoyaltyEligible } = useMemo(() => {
        if (orders.length === 0) return { valorApresentado: 0, totalSaldoAluguel: 0, totalPrejuizos: 0, isDivida: false, totalGeral: 0, totalFrete: 0, subtotalOriginal: 0, valorDesconto: 0, isLoyaltyEligible: false };

        const isDivida = orders.some(o => o.status.toUpperCase() === 'PREJUIZO');
        let totalSaldoAluguel = 0;
        let totalPrejuizos = 0;

        if (isDivida) {
            orders.forEach(order => {
                let saldoRent = Number(order.valor_total) - Number(order.valor_sinal);
                totalSaldoAluguel += saldoRent;
                if (order.ItemReservas) {
                    order.ItemReservas.forEach(item => {
                        if (item.prejuizo && !item.prejuizo.resolvido) {
                            totalPrejuizos += Number(item.prejuizo.valor_prejuizo);
                        }
                    });
                }
            });
        }

        const valorApresentado = isDivida 
            ? totalSaldoAluguel + totalPrejuizos 
            : orders.reduce((acc, curr) => acc + Number(curr.valor_sinal), 0);

        const totalGeral = orders.reduce((acc, curr) => acc + Number(curr.valor_total), 0);
        const totalFrete = orders.reduce((acc, curr) => acc + Number(curr.custo_frete), 0);
        const totalComDesconto = totalGeral - totalFrete;
        const isLoyaltyEligible = loyaltyConfig?.ativo && (completedOrders) % (loyaltyConfig?.num || 0) === 0;

        let subtotalOriginal = totalComDesconto;
        let valorDesconto = 0;
        if (isLoyaltyEligible && loyaltyConfig) {
            subtotalOriginal = totalComDesconto / (1 - (loyaltyConfig.pct / 100));
            valorDesconto = subtotalOriginal - totalComDesconto;
        }

        return { valorApresentado, totalSaldoAluguel, totalPrejuizos, isDivida, totalGeral, totalFrete, subtotalOriginal, valorDesconto, isLoyaltyEligible };
    }, [orders, loyaltyConfig, completedOrders]);

    // Configuração do Mercado Pago
    const initialization = useMemo(() => {
        const user = orders[0]?.Usuario;
        const email = (user?.email || '').trim().toLowerCase();
        
        // Trata o nome para garantir primeiro e sobrenome
        const nomeCompleto = (user?.nome || 'Cliente').trim();
        const nomeParts = nomeCompleto.split(/\s+/).filter(Boolean);
        const firstName = nomeParts[0] || 'Cliente';
        // Se não tiver sobrenome, o MP pode travar. Usamos um sobrenome genérico se necessário.
        const lastName = nomeParts.length > 1 ? nomeParts.slice(1).join(' ') : 'da Silva';

        const docType = user?.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF';
        // Limpa TUDO que não for número do documento
        const docNumber = (user?.cnpj || user?.cpf || '').replace(/\D/g, '');

        const dataInit = {
            amount: Number(valorApresentado.toFixed(2)),
            payer: {
                email: email,
                firstName: firstName,
                lastName: lastName,
                entityType: (user?.tipo_pessoa === 'juridica' ? 'association' : 'individual') as any,
                identification: {
                    type: docType,
                    number: docNumber,
                }
            },
        };
        console.log('MERCADO PAGO INITIALIZATION (LIMPO):', JSON.stringify(dataInit, null, 2));
        return dataInit;
    }, [valorApresentado, orders]);

    const customization = useMemo(() => ({
        visual: {
            hidePayerInformation: true,
            hideFormTitle: true,
            defaultPaymentMethod: 'bank_transfer' as const,
        },
        paymentMethods: {
            bankTransfer: ["pix"] as const,
            creditCard: "all" as const,
            debitCard: "all" as const,
            mercadoPago: "all" as const,
            excludePaymentMethods: ['debvisa'] as string[], 
            // Configuração de parcelamento explícita
            installments: "all" as const, 
            minInstallments: 1, // Permite 1x (à vista)
            maxInstallments: 12 // Limita em até 12x
        },
        payer: {
            email: initialization.payer.email,
            firstName: initialization.payer.firstName,
            lastName: initialization.payer.lastName,
            identification: {
                type: initialization.payer.identification.type,
                number: initialization.payer.identification.number,
            },
        }
    }), [initialization]);

    const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
        
        const extendedFormData = {
            ...formData,
            payer: formData.payer || {
                email: initialization.payer.email,
                firstName: initialization.payer.firstName,
                lastName: initialization.payer.lastName,
                identification: initialization.payer.identification,
            }
        };

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/payments/process`, {
                formData: extendedFormData,
                orderIds: idList,
                paymentMethod: selectedPaymentMethod
            }, config);
            
            if (data && (data.id || data.status === 'approved')) {
                const status = data.status || 'approved';
                const payment_id = data.id || 'ALREADY_PAID';
                const payment_type = selectedPaymentMethod;
                
                const installments = Number(formData.installments) || 1;
                const rawInstallmentAmount = data.transaction_details?.installment_amount;
                const installment_amount = rawInstallmentAmount && rawInstallmentAmount > 0 
                    ? rawInstallmentAmount 
                    : (valorApresentado / installments);
                
                const total_paid = data.transaction_details?.total_paid_amount || (installment_amount * installments);

                // Captura dos dados do cartão
                const card_brand = data.payment_method_id || data.payment_method?.id || '';
                const last_4 = (data.card?.last_four_digits || '').replace(/\D/g, ''); 

                const primaryOrderId = idList[0];
                navigate(`/payment/success/${primaryOrderId}?ids=${idList.join(',')}&payment_id=${payment_id}&status=${status}&payment_type=${payment_type}&installments=${installments}&installment_amount=${installment_amount}&total_paid=${total_paid}&card_brand=${card_brand}&last_4=${last_4}`, { replace: true });
            }
            return data;
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            throw error;
        }
    };

    const onError = (error: any) => console.error('Erro no Mercado Pago:', error);
    const onReady = () => console.log('Mercado Pago pronto');

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#000' }}>Carregando...</div>;
    if (orders.length === 0) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#000' }}>Pedidos não encontrados.</div>;

    if (orders.some(o => o.status === 'cancelada')) {
        return (
            <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '12px' }}>
                <h2 style={{ color: '#c62828' }}>Tempo Esgotado!</h2>
                <p>Uma ou mais reservas foram canceladas.</p>
                <button onClick={() => navigate('/')} style={{ padding: '15px 30px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px' }}>Fazer Nova Reserva</button>
            </div>
        );
    }

    const isEntrega = orders[0]?.tipo_entrega === 'entrega';
    const hasMultiple = idList.length > 1;
    const textoLogistica = isEntrega ? (hasMultiple ? 'Entregas' : 'Entrega') : (hasMultiple ? 'Retiradas na Loja' : 'Retirada na Loja');

    if (!import.meta.env.VITE_MP_PUBLIC_KEY) {
        console.warn('VITE_MP_PUBLIC_KEY não está definida!');
    }

    return (
        <div style={{ maxWidth: '600px', margin: '100px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
            <div className="order-summary" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', marginBottom: '25px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#000' }}>
                <h4 style={{marginTop: 0, color: isDivida ? '#c62828' : '#000', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {isDivida ? '🚨 Acerto de Pendências' : `Resumo do Pedido (${idList.length} ${textoLogistica})`}
                </h4>

                {isDivida ? (
                    <>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                            <span style={{fontWeight: 500, color: '#555'}}>Saldo Restante do Aluguel:</span>
                            <span style={{fontWeight: 500, color: '#555'}}>R$ {totalSaldoAluguel.toFixed(2)}</span>
                        </div>
                        {totalPrejuizos > 0 && (
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                <span style={{fontWeight: 500, color: '#c62828'}}>Avarias / Extravios (B.O.):</span>
                                <span style={{fontWeight: 500, color: '#c62828'}}>R$ {totalPrejuizos.toFixed(2)}</span>
                            </div>
                        )}
                        <hr style={{border: 'none', borderTop: '1px dashed #ddd', margin: '15px 0'}} />
                    </>
                ) : (
                    <>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                            <span style={{fontWeight: 500}}>Itens (Subtotal):</span>
                            <span style={{fontWeight: 500}}>R$ {subtotalOriginal.toFixed(2)}</span>
                        </div>
                        {isLoyaltyEligible && (
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#28a745', fontWeight: 'bold'}}>
                                <span>Desconto Fidelidade ({loyaltyConfig?.pct}%):</span>
                                <span>- R$ {valorDesconto.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                            <span style={{fontWeight: 500}}>{textoLogistica}:</span>
                            <span style={{fontWeight: 500}}>{totalFrete > 0 ? `R$ ${totalFrete.toFixed(2)}` : 'Grátis'}</span>
                        </div>
                        <hr style={{border: 'none', borderTop: '1px dashed #ddd', margin: '15px 0'}} />
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: '#000'}}>
                            <span>Total Geral:</span>
                            <span>R$ {totalGeral.toFixed(2)}</span>
                        </div>
                    </>
                )}

                <div style={{
                    marginTop: '15px', padding: '15px', borderRadius: '8px', textAlign: 'center',
                    backgroundColor: isDivida ? '#ffebee' : '#e8f5e9',
                    border: `1px solid ${isDivida ? '#ffcdd2' : '#c8e6c9'}`,
                    color: isDivida ? '#c62828' : '#000'
                }}>
                    <small style={{display: 'block', marginBottom: '5px', fontWeight: 600}}>
                        {isDivida
                            ? 'Valor Total Devido (A Pagar)'
                            : (lojaConfig?.sinal_porcentagem >= 100 ? 'Pagamento Integral da Reserva' : `Sinal para reservar o Lote (${lojaConfig?.sinal_porcentagem || 50}%)`)
                        }
                    </small>
                    <span style={{fontSize: '1.5rem', fontWeight: 'bold'}}>R$ {valorApresentado.toFixed(2)}</span>
                </div>
            </div>

            <div className="payment-form" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', backgroundColor: '#fff' }}>
                {isMpLoaded && valorApresentado > 0 && initialization.payer.email && initialization.payer.identification.number && (
                    <Payment
                        key={`${valorApresentado}-${initialization.payer.email}-${initialization.payer.identification.number}`}
                        initialization={initialization}
                        customization={customization}
                        onSubmit={onSubmit}
                        onReady={onReady}
                        onError={onError}
                    />
                )}
            </div>
        </div>
    );
};

export default PaymentPage;