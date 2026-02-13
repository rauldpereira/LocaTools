import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const CheckoutForm = ({ usuario }: { usuario: UsuarioDaOrdem }) => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const { orderId } = useParams<{ orderId: string }>();
    const { token: authToken } = useAuth();
    
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    
    const [tipoDoc, setTipoDoc] = useState<'cpf' | 'cnpj'>('cpf');
    const [documento, setDocumento] = useState('');
    const [nomeCartao, setNomeCartao] = useState(''); 

    useEffect(() => {
        if (usuario) {
            if (usuario.tipo_pessoa === 'juridica' && usuario.cnpj) {
                setTipoDoc('cnpj');
                setDocumento(formatarCNPJ(usuario.cnpj));
            } else if (usuario.cpf) {
                setTipoDoc('cpf');
                setDocumento(formatarCPF(usuario.cpf));
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

        if (!nomeCartao.trim()) {
            setError('Por favor, digite o nome impresso no cartão.');
            setProcessing(false);
            return;
        }

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

        const { error: stripeError, token: stripeToken } = await stripe.createToken(cardElement, {
            name: nomeCartao, 
        });

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
                    cpfCnpj: docLimpo 
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
                color: '#000', 
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': { color: '#888' },
            },
            invalid: { color: '#fa755a', iconColor: '#fa755a' },
        },
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
            
            {error && (
                <div style={{ 
                    color: '#721c24', backgroundColor: '#f8d7da', 
                    padding: '10px', borderRadius: '5px', marginTop: '15px', fontSize: '0.9rem', fontWeight: 'bold'
                }}>
                    ⚠️ {error}
                </div>
            )}
            
            <button
                disabled={!stripe || processing}
                type="submit"
                style={{ 
                    marginTop: '20px', width: '100%', padding: '15px', 
                    fontSize: '18px', cursor: 'pointer', 
                    backgroundColor: processing ? '#ccc' : '#28a745', 
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontWeight: 'bold', transition: '0.3s'
                }}
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
    const navigate = useNavigate();

    useEffect(() => {
        if (!orderId || !token) return;
        const fetchOrder = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const { data } = await axios.get(`http://localhost:3001/api/reservations/${orderId}`, config);
                setOrder(data);
            } catch (error) {
                console.error("Erro:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();

        const interval = setInterval(() => {
            fetchOrder();
        }, 10000); 

        return () => clearInterval(interval);

    }, [orderId, token]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#000' }}>Carregando...</div>;
    if (!order) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#000' }}>Pedido não encontrado.</div>;

    if (order.status === 'cancelada') {
        return (
            <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>⏱️</div>
                <h2 style={{ color: '#c62828', marginTop: 0 }}>Tempo Esgotado!</h2>
                <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '30px' }}>
                    O prazo para pagamento expirou e sua reserva foi cancelada. Os equipamentos foram liberados para outros clientes.
                </p>
                <button 
                    onClick={() => navigate('/')} 
                    style={{ padding: '15px 30px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: '0.3s' }}
                >
                    Fazer Nova Reserva
                </button>
            </div>
        );
    }

    const subtotal = Number(order.valor_total) - Number(order.custo_frete);

    let horaLimiteFormatada = '';
    if (order.createdAt) {
        const dataCriacao = new Date(order.createdAt);
        const tempoLimite = new Date(dataCriacao.getTime() + 60 * 60 * 1000);
        horaLimiteFormatada = tempoLimite.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div style={{ maxWidth: '600px', margin: '100px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
            
            {/* AVISO DE TEMPO LIMITE */}
            {horaLimiteFormatada && (
                <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffeeba', textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 5px 0' }}>⚠️ Pagamento Pendente</h4>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#d32f2f' }}>
                        ⏳ Realize o pagamento até as {horaLimiteFormatada} ou o pedido será cancelado.
                    </p>
                </div>
            )}

            <div className="order-summary" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', marginBottom: '25px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: '#000' }}>
                <h4 style={{marginTop: 0, color: '#000', fontSize: '1.2rem'}}>Resumo do Pedido #{orderId}</h4>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                    <span style={{fontWeight: 500}}>Itens:</span>
                    <span style={{fontWeight: 500}}>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                    <span style={{fontWeight: 500}}>Entrega:</span>
                    <span style={{fontWeight: 500}}>{order.tipo_entrega === 'retirada' ? 'Retirada' : (Number(order.custo_frete) > 0 ? `R$ ${Number(order.custo_frete).toFixed(2)}` : 'Grátis')}</span>
                </div>
                <hr style={{border: 'none', borderTop: '1px dashed #ddd', margin: '15px 0'}} />
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: '#000'}}>
                    <span>Total:</span>
                    <span>R$ {Number(order.valor_total).toFixed(2)}</span>
                </div>
                
                <div style={{marginTop: '15px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#000', textAlign: 'center', border: '1px solid #c8e6c9'}}>
                    <small style={{display: 'block', marginBottom: '5px', fontWeight: 600}}>Sinal para reservar (50%)</small>
                    <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#000'}}>R$ {Number(order.valor_sinal).toFixed(2)}</span>
                </div>
            </div>
            
            <div className="payment-form" style={{ border: '1px solid #eee', padding: '25px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CheckoutForm usuario={order.Usuario} />
            </div>
        </div>
    );
};

export default PaymentPage;