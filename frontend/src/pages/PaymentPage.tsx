import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
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

const isCPFValido = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};

const isCNPJValido = (cnpj: string) => {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;
    return true;
};

const formatarCPF = (v: string) => {
    v = v.replace(/\D/g, '').slice(0, 11);
    return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatarCNPJ = (v: string) => {
    v = v.replace(/\D/g, '').slice(0, 14);
    return v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

const CheckoutForm = ({ usuario, orderIdsList }: { usuario: UsuarioDaOrdem, orderIdsList: number[] }) => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const { token: authToken } = useAuth();
    
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    
    const [tipoDoc, setTipoDoc] = useState<'cpf' | 'cnpj'>('cpf');
    const [documento, setDocumento] = useState('');
    const [nomeCartao, setNomeCartao] = useState(''); 

    useEffect(() => {
        if (usuario) {
            if (usuario.tipo_pessoa === 'juridica' && usuario.cnpj) {
                setTipoDoc('cnpj'); setDocumento(formatarCNPJ(usuario.cnpj));
            } else if (usuario.cpf) {
                setTipoDoc('cpf'); setDocumento(formatarCPF(usuario.cpf));
            }
        }
    }, [usuario]);

    const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (tipoDoc === 'cpf') {
            setDocumento(formatarCPF(e.target.value));
        } else {
            setDocumento(formatarCNPJ(e.target.value));
        }
    };

    const handleTrocarTipoDoc = (tipo: 'cpf' | 'cnpj') => {
        setTipoDoc(tipo);
        setDocumento('');
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        setError(null);

        if (!nomeCartao.trim()) { setError('Por favor, digite o nome impresso no cartão.'); setProcessing(false); return; }
        const docLimpo = documento.replace(/\D/g, '');

        if (tipoDoc === 'cpf' && !isCPFValido(docLimpo)) {
            setError('Por favor, preencha um CPF válido.');
            setProcessing(false);
            return;
        }

        if (tipoDoc === 'cnpj' && !isCNPJValido(docLimpo)) {
            setError('Por favor, preencha um CNPJ válido.');
            setProcessing(false);
            return;
        }
        
        if (!stripe || !elements || !authToken) { setError('Erro ao carregar o pagamento.'); setProcessing(false); return; }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) { setError('Elemento do cartão não encontrado.'); setProcessing(false); return; }

        const { error: stripeError, token: stripeToken } = await stripe.createToken(cardElement, { name: nomeCartao });

        if (stripeError) { setError(stripeError.message || 'Erro ao validar o cartão.'); setProcessing(false); return; }

        if (stripeToken) {
            try {
                const config = { headers: { Authorization: `Bearer ${authToken}` } };
                await axios.post('http://localhost:3001/api/payments/process', {
                    orderIds: orderIdsList, 
                    token: stripeToken.id,
                    cpfCnpj: docLimpo 
                }, config);

                navigate(`/payment/success/${orderIdsList.join(',')}`);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Falha ao processar o pagamento no servidor.');
                setProcessing(false);
            }
        }
    };

    const cardElementOptions = {
        style: { base: { color: '#000', fontSize: '16px', '::placeholder': { color: '#888' } }, invalid: { color: '#fa755a' } },
        hidePostalCode: true,
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '20px', color: '#000' }}>Dados do Pagamento</h3>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#000', fontWeight: 600 }}>
                    Nome impresso no Cartão
                </label>
                <input 
                    type="text" 
                    value={nomeCartao}
                    onChange={(e) => setNomeCartao(e.target.value.toUpperCase())} 
                    placeholder="JOÃO S SILVA"
                    required
                    style={{
                        width: '100%', padding: '12px', border: '1px solid #ccc',
                        borderRadius: '5px', fontSize: '16px', boxSizing: 'border-box', color: '#000'
                    }}
                />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#000', fontWeight: 600 }}>
                    Documento do Titular do Cartão
                </label>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button
                        type="button"
                        onClick={() => handleTrocarTipoDoc('cpf')}
                        style={{
                            flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '5px',
                            backgroundColor: tipoDoc === 'cpf' ? '#007bff' : '#f8f9fa',
                            color: tipoDoc === 'cpf' ? '#fff' : '#000', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        CPF
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTrocarTipoDoc('cnpj')}
                        style={{
                            flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '5px',
                            backgroundColor: tipoDoc === 'cnpj' ? '#007bff' : '#f8f9fa',
                            color: tipoDoc === 'cnpj' ? '#fff' : '#000', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        CNPJ
                    </button>
                </div>

                <input 
                    type="text" 
                    value={documento}
                    onChange={handleDocChange}
                    placeholder={tipoDoc === 'cpf' ? "000.000.000-00" : "00.000.000/0000-00"}
                    maxLength={18}
                    required
                    style={{
                        width: '100%', padding: '12px', border: '1px solid #ccc',
                        borderRadius: '5px', fontSize: '16px', boxSizing: 'border-box', color: '#000'
                    }}
                />
            </div>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#000', fontWeight: 600 }}>
                    Cartão de Crédito
                </label>
                <div style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: 'white' }}>
                    <CardElement options={cardElementOptions} />
                </div>
            </div>
            
            {error && <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px', marginTop: '15px', fontWeight: 'bold' }}>⚠️ {error}</div>}
            
            <button disabled={!stripe || processing} type="submit" style={{ marginTop: '20px', width: '100%', padding: '15px', fontSize: '18px', cursor: 'pointer', backgroundColor: processing ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                {processing ? 'Processando...' : 'Pagar Agora'}
            </button>
        </form>
    );
}; 

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

    const rawIds = queryIds || orderId || '';
    const idList = rawIds.split(',').filter(Boolean).map(Number);

    useEffect(() => {
        if (idList.length === 0 || !token) return;

        const fetchOrders = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const fetchedOrders = await Promise.all(
                    idList.map(id => axios.get(`http://localhost:3001/api/reservations/${id}`, config).then(res => res.data))
                );
                setOrders(fetchedOrders);
            } catch (error) {
                console.error("Erro:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [rawIds, token]);

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

    // SEPARA OS CUSTOS DA DÍVIDA
    const isDivida = orders.some(o => o.status === 'PREJUIZO');
    
    let valorApresentado = 0;
    let totalSaldoAluguel = 0;
    let totalPrejuizos = 0;
    
    if (isDivida) {
        orders.forEach(order => {
            // Saldo restante do aluguel (Total - Sinal que ele já pagou)
            let saldoRent = Number(order.valor_total) - Number(order.valor_sinal);
            totalSaldoAluguel += saldoRent;

            // Soma das Avarias/Perdas
            if (order.ItemReservas) {
                order.ItemReservas.forEach(item => {
                    if (item.prejuizo && !item.prejuizo.resolvido) {
                        totalPrejuizos += Number(item.prejuizo.valor_prejuizo);
                    }
                });
            }
        });
        valorApresentado = totalSaldoAluguel + totalPrejuizos;
    } else {
        valorApresentado = orders.reduce((acc, curr) => acc + Number(curr.valor_sinal), 0);
    }

    // Custos do fluxo normal (Sinal)
    const totalGeral = orders.reduce((acc, curr) => acc + Number(curr.valor_total), 0);
    const totalFrete = orders.reduce((acc, curr) => acc + Number(curr.custo_frete), 0);
    const totalSubtotal = totalGeral - totalFrete;

    return (
        <div style={{ maxWidth: '600px', margin: '100px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
            
            <div className="order-summary" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', marginBottom: '25px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#000' }}>
                
                <h4 style={{marginTop: 0, color: isDivida ? '#c62828' : '#000', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    {isDivida ? '🚨 Acerto de Pendências' : `Resumo do Pedido (${idList.length} ${textoLogistica})`}
                </h4>
                
                {/* FLUXO DO CALOTEIRO DÍVIDA DETALHADA */}
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
                /* FLUXO NORMAL CLIENTE NOVO PAGANDO SINAL */
                    <>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                            <span style={{fontWeight: 500}}>Itens:</span>
                            <span style={{fontWeight: 500}}>R$ {totalSubtotal.toFixed(2)}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                            <span style={{fontWeight: 500}}>{textoLogistica}:</span>
                            <span style={{fontWeight: 500}}>{totalFrete > 0 ? `R$ ${totalFrete.toFixed(2)}` : 'Grátis'}</span>
                        </div>
                        <hr style={{border: 'none', borderTop: '1px dashed #ddd', margin: '15px 0'}} />
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: '#000'}}>
                            <span>Total dos Contratos:</span>
                            <span>R$ {totalGeral.toFixed(2)}</span>
                        </div>
                    </>
                )}

                {/* CAIXA DE DESTAQUE COM O VALOR FINAL QUE VAI PASSAR NO CARTÃO */}
                <div style={{
                    marginTop: '15px', padding: '15px', borderRadius: '8px', textAlign: 'center', 
                    backgroundColor: isDivida ? '#ffebee' : '#e8f5e9', 
                    border: `1px solid ${isDivida ? '#ffcdd2' : '#c8e6c9'}`,
                    color: isDivida ? '#c62828' : '#000'
                }}>
                    <small style={{display: 'block', marginBottom: '5px', fontWeight: 600}}>
                        {isDivida ? 'Valor Total Devido (A Pagar)' : 'Sinal para reservar o Lote (50%)'}
                    </small>
                    <span style={{fontSize: '1.5rem', fontWeight: 'bold'}}>R$ {valorApresentado.toFixed(2)}</span>
                </div>
            </div>
            
            <div className="payment-form" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', backgroundColor: '#fff' }}>
                <CheckoutForm usuario={orders[0].Usuario} orderIdsList={idList} />
            </div>
        </div>
    );
};

export default PaymentPage;