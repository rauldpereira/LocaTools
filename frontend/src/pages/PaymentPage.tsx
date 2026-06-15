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

const FullPageSkeleton = () => (
    <div style={{ maxWidth: '600px', margin: '100px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
        <div style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', marginBottom: '25px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '20px', borderRadius: '4px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="skeleton" style={{ height: '16px', width: '30%' }} />
                <div className="skeleton" style={{ height: '16px', width: '20%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="skeleton" style={{ height: '16px', width: '35%' }} />
                <div className="skeleton" style={{ height: '16px', width: '15%' }} />
            </div>
            <hr style={{ border: 'none', borderTop: '1px dashed #ddd', margin: '15px 0' }} />
            <div className="skeleton" style={{ height: '70px', width: '100%', borderRadius: '8px' }} />
        </div>

        <div style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', backgroundColor: '#fff' }}>
            <div className="skeleton" style={{ height: '20px', width: '40%', marginBottom: '25px', borderRadius: '4px' }} />
            {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '12px' }}>
                    <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '15px' }} />
                    <div className="skeleton" style={{ flex: 1, height: '16px', borderRadius: '4px' }} />
                </div>
            ))}
            <div className="skeleton" style={{ height: '48px', width: '100%', marginTop: '20px', borderRadius: '8px' }} />
        </div>
    </div>
);

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
    const [isMpReady, setIsMpReady] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        const key = import.meta.env.VITE_MP_PUBLIC_KEY || '';
        const isSandbox = key.startsWith('TEST-');
        const email = isSandbox ? '' : (user?.email || '').trim().toLowerCase();
        
        // Trata o nome para garantir primeiro e sobrenome
        const nomeCompleto = (user?.nome || 'Cliente').trim();
        const nomeParts = nomeCompleto.split(/\s+/).filter(Boolean);
        const firstName = nomeParts[0] || 'Cliente';
        // Se não tiver sobrenome, o MP pode travar. Usamos um sobrenome genérico se necessário.
        const lastName = nomeParts.length > 1 ? nomeParts.slice(1).join(' ') : 'da Silva';

        const docType = user?.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF';
        // Limpa TUDO que não for número do documento
        const docNumber = isSandbox ? '' : (user?.cnpj || user?.cpf || '').replace(/\D/g, '');

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
            hidePayerInformation: false,
            hideFormTitle: true,
        },
        paymentMethods: {
            bankTransfer: "all" as const,
            creditCard: "all" as const,
            debitCard: "all" as const,
            maxInstallments: 12 // Limita em até 12x
        }
    }), []);

    const onSubmit = async ({ selectedPaymentMethod, formData }: any) => {
        
        const extendedFormData = {
            ...formData,
            payer: {
                email: formData.payer?.email || initialization.payer.email,
                firstName: formData.payer?.firstName || formData.payer?.first_name || initialization.payer.firstName,
                lastName: formData.payer?.lastName || formData.payer?.last_name || initialization.payer.lastName,
                identification: {
                    type: formData.payer?.identification?.type || initialization.payer.identification.type,
                    number: formData.payer?.identification?.number || initialization.payer.identification.number,
                }
            }
        };

        try {
            setErrorMessage(null);
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

                setIsSuccess(true);
                setTimeout(() => {
                    navigate(`/payment/success/${primaryOrderId}?ids=${idList.join(',')}&payment_id=${payment_id}&status=${status}&payment_type=${payment_type}&installments=${installments}&installment_amount=${installment_amount}&total_paid=${total_paid}&card_brand=${card_brand}&last_4=${last_4}`, { replace: true });
                }, 2000);
            }
            return data;
        } catch (error: any) {
            console.error('Erro ao processar pagamento:', error);
            let userMsg = 'Ocorreu um erro ao processar o pagamento. Verifique os dados do cartão.';
            if (error.response?.data?.details) {
                const detail = error.response.data.details;
                if (detail.includes('bin_not_found')) {
                    userMsg = 'Cartão inválido ou não suportado (BIN não encontrado). Tente outro cartão.';
                } else if (detail.includes('invalid_token')) {
                    userMsg = 'Sessão de pagamento expirada. Por favor, recarregue a página.';
                } else {
                    userMsg = `Erro: ${detail}`;
                }
            } else if (error.response?.data?.error) {
                userMsg = error.response.data.error;
            }
            setErrorMessage(userMsg);
            throw error;
        }
    };

    const onError = (error: any) => console.error('Erro no Mercado Pago:', error);
    const onReady = () => setIsMpReady(true);

    const isAllDataReady = orders.length > 0 && lojaConfig !== null;
    const isPageReady = isAllDataReady;

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
        <div style={{ maxWidth: '600px', margin: '100px auto', fontFamily: 'sans-serif', padding: '0 20px', position: 'relative' }}>
            
            {/* Overlay de Sucesso */}
            {isSuccess && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, animation: 'fadeInOverlay 0.4s ease'
                }}>
                    <style>{`
                        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
                        .checkmark { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 2; stroke: #4bb543; stroke-miterlimit: 10; box-shadow: inset 0px 0px 0px #4bb543; animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both; }
                        .checkmark__circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: #4bb543; fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
                        .checkmark__check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }
                        @keyframes stroke { 100% { stroke-dashoffset: 0; } }
                        @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
                        @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px #fff; } }
                    `}</style>
                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                    <h2 style={{ color: '#2c3e50', marginTop: '20px' }}>Pagamento Aprovado!</h2>
                    <p style={{ color: '#666' }}>Redirecionando para os detalhes do pedido...</p>
                </div>
            )}

            {!isPageReady && (
                <div style={{ position: 'absolute', top: 0, left: 20, right: 20, zIndex: 50, backgroundColor: '#f8f9fa' }}>
                   <FullPageSkeleton />
                </div>
            )}
            
            <div style={{ visibility: isPageReady ? 'visible' : 'hidden', opacity: isPageReady ? 1 : 0, transition: 'opacity 0.3s ease-in', animation: 'fadeInPayment 0.6s ease-out' }}>
                <style>{`
                    @keyframes fadeInPayment {
                        from { opacity: 0; transform: translateY(8px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
                <div className="order-summary" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', marginBottom: '25px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#000' }}>
                    <h4 style={{marginTop: 0, color: isDivida ? '#c62828' : '#000', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        {isDivida ? 'Acerto de Pendências' : `Resumo do Pedido (${idList.length} ${textoLogistica})`}
                    </h4>

                    {isDivida ? (
                        <>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                <span style={{fontWeight: 500, color: '#555'}}>Saldo Restante do Aluguel:</span>
                                <span style={{fontWeight: 500, color: '#555'}}>R$ {totalSaldoAluguel.toFixed(2)}</span>
                            </div>
                            {totalPrejuizos > 0 && (
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                    <span style={{fontWeight: 500, color: '#c62828'}}>Avarias / Extravios (Ocorrências):</span>
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

                <div className="payment-form" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', backgroundColor: '#fff', minHeight: '350px' }}>
                    {errorMessage && (
                        <div style={{ 
                            backgroundColor: '#fff5f5', 
                            color: '#c53030', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            marginBottom: '20px', 
                            border: '1px solid #feb2b2',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>⚠️</span> {errorMessage}
                        </div>
                    )}

                    {!isMpReady && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '0.95rem' }}>
                            Carregando formulário de pagamento seguro...
                        </div>
                    )}

                    {isMpLoaded && valorApresentado > 0 && (
                        <Payment
                            key={`${valorApresentado}-${initialization.payer.email}`}
                            initialization={initialization}
                            customization={customization}
                            onSubmit={onSubmit}
                            onReady={onReady}
                            onError={onError}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;